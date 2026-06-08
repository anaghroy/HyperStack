import axios from "axios";
import { tool } from "langchain";
import { write } from "fs";
import * as z from "zod";

export const listFiles = tool(
  async ({ }, config) => {
    const writer = config.configurable.writer;
    writer("data: " + JSON.stringify({ text: "Listing files in project directory...\n" }) + "\n\n");

    const response = await axios.get(
      `http://sandbox-service-${config.configurable.projectId}:3000/list-files`,
    );
    writer(
      "data: " + JSON.stringify({ text: "Files listed successfully.\nFiles: " + response.data.files.join(",") + "\n" }) + "\n\n"
    );
    return JSON.stringify(response.data.files);
  },
  {
    name: "list_files",
    description:
      "list all files in the project directory. This is useful for understanding what files are available t work with",
    schema: z.object({
      path: z.string().optional().describe("Optional path to list files for, defaults to root")
    }),
  },
);

export const readFiles = tool(
  async ({ files = [] }, config) => {
    const writer = config.configurable.writer;
    writer("data: " + JSON.stringify({ text: `Reading files... ${files.join(",")}\n` }) + "\n\n");

    const response = await axios.post(
      `http://sandbox-service-${config.configurable.projectId}:3000/read-files?files=` +
        files.join(","),
    );
    writer("data: " + JSON.stringify({ text: "Files read successfully.\n" }) + "\n\n");
    return JSON.stringify(response.data);
  },
  {
    name: "read_files",
    description:
      "Read files from the project directory. This is useful for understanding what files are available t work with",
    schema: z.object({
      files: z
        .array(z.string())
        .describe(
          "The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later",
        ),
    }),
  },
);

export const updateFiles = tool(
  async ({ files }, config) => {
    const writer = config.configurable.writer;

    writer("data: " + JSON.stringify({ text: `Updating files... ${files.map((f) => f.file).join(",")}\n` }) + "\n\n");
    const response = await axios.patch(
      `http://sandbox-service-${config.configurable.projectId}:3000/update-files`,
      { updates: files },
    );

    writer("data: " + JSON.stringify({ text: "Files updated successfully.\n" }) + "\n\n");
    return JSON.stringify(response.data.results);
  },
  {
    name: "create_or_update_files",
    description:
      "Update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. this tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field.",
    schema: z.object({
      files: z
        .array(
          z.object({
            file: z
              .string()
              .describe("The absolute path of the file to update"),
            content: z
              .string()
              .describe(
                "The exact raw text content to write to the file. Do NOT wrap this in extra JSON, stringify it, or escape it unnecessarily. Just provide the pure source code or text.",
              ),
          }),
        )
        .describe("The list of files to update and their new contents"),
    }),
  },
);
