import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import pty from "node-pty";
import os from "os";
import cors from "cors";
import { exec } from "child_process";

const WORKING_DIR = "/workspace"; // This is the directory where all the project files will be stored

const app = express();
const httpServer = http.createServer(app);
app.use(morgan("dev"));

app.use(cors({ 
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
  },
  transports: ["websocket", "polling"],
  allowUpgrades: true,
  perMessageDeflate: false,
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hello from Sandbox Agent Server!",
    status: "success",
  });
});

const shell = process.env.SHELL || "bash";
const ptyProcess = pty.spawn(shell, [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: "/workspace",
  env: process.env,
});

ptyProcess.onData((data) => {
  io.emit("terminal-output", data);
});

ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`PTY process exited with code: ${exitCode}, signal: ${signal}`);
});

io.on("connection", (socket) => {
  console.log("Client connected: " + socket.id);

  socket.on("terminal-input", (data) => {
    ptyProcess.write(data);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected: " + socket.id);
  });
});

/**
 * @route GET /list-files
 * @description Lists all files in the working directory and its subdirectories. Returns a JSON object with the file paths relative to the working directory. exclude directories like node_modules, .git,dist, etc.
 * - eg. {
 *     "files": [
 *         "file1.txt",
 *         "src/file2.txt",
 *         "src/subdir/file3.txt"
 *     ]
 * }
 */
app.get("/list-files", async (req, res) => {
  const listFiles = async (dir, baseDir) => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Exclude certain directories
      if (
        entry.isDirectory() &&
        ["node_modules", ".git", "dist"].includes(entry.name)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...(await listFiles(fullPath, baseDir)));
      } else {
        files.push(relativePath);
      }
    }

    return files;
  };

  try {
    const files = await listFiles(WORKING_DIR, WORKING_DIR);
    res.status(200).json({
      message: "Files listed successfully",
      files,
    });
  } catch (err) {
    res.status(500).json({
      message: `Error listing files: ${err.message}`,
      status: "error",
    });
  }
});

/**
 * @route GET /read-files
 * @description Reads the content of all files requested in the query parameter 'files' and returns their content as a JSON object.
 * - eg. /read-files?files=file1.txt,/src/file2.txt
 */
app.get("/read-files", async (req, res) => {
  const files = req.query.files;

  if (!files) {
    return res.status(400).json({
      message: "No files specified in query parameter",
      status: "error",
    });
  }

  const fileList = files.split(",");

  const results = await Promise.all(
    fileList.map(async (file) => {
      const filePath = path.join(WORKING_DIR, file);
      try {
        const content = await fs.promises.readFile(filePath, "utf-8");
        return {
          [filePath.replace(WORKING_DIR, "")]: content,
        };
      } catch (err) {
        return {
          [filePath.replace(WORKING_DIR, "")]:
            `Error reading file: ${err.message}`,
        };
      }
    }),
  );

  res.status(200).json({
    message: "File contents",
    files: results,
  });
});

/**
 * @route PATCH /update-files
 * @description Updates the content of files specified in the request body. The request body should container a property 'updates' with a JSON Array of object, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property specifying the new content for the file.
 */
app.patch("/update-files", async (req, res) => {
  const updates = req.body.updates;

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({
      message:
        'Invalid request body. Expected a JSON object with an "updates" property containing an array of file updates.',
      status: "error",
    });
  }

  const results = await Promise.all(
    updates.map(async (update) => {
      const { file, content } = update;
      const filePath = path.join(WORKING_DIR, file);
      try {
        console.log(path.dirname(filePath), filePath);

        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, "utf-8");
        return {
          [filePath]: "File updated successfully",
        };
      } catch (err) {
        return {
          [filePath]: `Error updating file: ${err.message}`,
        };
      }
    }),
  );

  io.emit("file-system-changed");

  res.status(200).json({
    message: "File update results",
    results,
  });
});

/**
 * @route POST /create-files
 * @description Creates new files with the content specified in the request body. The request body should contain a property 'files' with a JSON Array of objects, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property specifying the content for the new file.
 */
app.post("/create-files", async (req, res) => {
  const files = req.body.files;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({
      message:
        'Invalid request body. Expected a JSON object with a "files" property containing an array of file objects.',
      status: "error",
    });
  }

  const results = await Promise.all(
    files.map(async (fileObj) => {
      const { file, content } = fileObj;
      const filePath = path.join(WORKING_DIR, file);
      try {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content, "utf-8");
        return {
          [filePath]: "File created successfully",
        };
      } catch (err) {
        return {
          [filePath]: `Error creating file: ${err.message}`,
        };
      }
    }),
  );

  io.emit("file-system-changed");

  res.status(200).json({
    message: "File creation results",
    results,
  });
});

/**
 * @route DELETE /delete-item
 * @description Deletes a file or directory.
 */
app.delete("/delete-item", async (req, res) => {
  const itemPath = req.query.path;
  if (!itemPath) {
    return res.status(400).json({ message: "No path specified", status: "error" });
  }

  try {
    const fullPath = path.join(WORKING_DIR, itemPath);
    await fs.promises.rm(fullPath, { recursive: true, force: true });
    io.emit("file-system-changed");
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: `Error deleting item: ${err.message}`, status: "error" });
  }
});

/**
 * @route GET /run-linter
 * @description Runs ESLint in the sandbox and returns the JSON output.
 */
app.get("/run-linter", (req, res) => {
  exec("npx eslint . -f json", { cwd: WORKING_DIR }, (error, stdout, stderr) => {
    try {
      // ESLint exits with code 1 if there are errors, but stdout still contains the JSON
      const lintResults = JSON.parse(stdout);
      res.status(200).json({ success: true, results: lintResults });
    } catch (parseError) {
      res.status(500).json({ success: false, error: "Failed to parse linter output", raw: stdout || stderr });
    }
  });
});

/**
 * @route GET /search
 * @description Global search across workspace files using grep.
 */
app.get("/search", (req, res) => {
  const { q, isCaseInsensitive, isRegex } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  let flags = "-rnI";
  if (isCaseInsensitive === "true") flags += "i";
  if (isRegex === "true") flags += "E";
  else flags += "F"; // Fixed strings (prevents regex injection if not intended)

  // Escape the query slightly if using regex, but JSON.stringify handles quotes safely
  // For bash, wrapping in single quotes is safer, but JSON.stringify gives double quotes which allows $ interpretation.
  // Actually, exec uses sh -c by default. Using JSON.stringify is risky if q contains $.
  // Let's use a safer escaping method for bash:
  const safeQ = "'" + q.replace(/'/g, "'\\''") + "'";

  const cmd = `grep ${flags} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist ${safeQ} .`;

  exec(cmd, { cwd: WORKING_DIR, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    // grep exits with code 1 if no matches found. That is not an application error.
    if (error && error.code !== 1) {
      console.error("Grep error:", error);
      return res.status(500).json({ success: false, error: "Search failed" });
    }

    if (!stdout.trim()) {
      return res.status(200).json({ success: true, matches: [] });
    }

    const matches = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      if (!line) continue;
      // grep -n output format: ./path/to/file:123:content
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match) {
        let filePath = match[1];
        if (filePath.startsWith("./")) filePath = filePath.substring(2); // Remove leading ./
        
        matches.push({
          file: filePath,
          line: parseInt(match[2], 10),
          content: match[3]
        });
      }
    }

    res.status(200).json({ success: true, matches });
  });
});

export default httpServer;
