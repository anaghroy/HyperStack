import axios from "axios";
import { tool } from "langchain";
import * as z from "zod";

export const listFiles = tool(
  async ({}, config) => {
    try {
      const { projectId } = config.configurable;
      const response = await axios.get(
        `http://sandbox-service-${projectId}:3000/list-files`,
      );
      return JSON.stringify(response.data.files);
    } catch (error) {
      return `Error listing files: Sandbox agent unreachable. Is the container running? (${error.message})`;
    }
  },
  {
    name: "list_files",
    description:
      "list all files in the project directory. This is useful for understanding what files are available t work with",
    schema: z.object({
      path: z
        .string()
        .optional()
        .describe("Optional path to list files for, defaults to root"),
    }),
  },
);

export const readFiles = tool(
  async ({ files = [] }, config) => {
    try {
      const response = await axios.get(
        `http://sandbox-service-${config.configurable.projectId}:3000/read-files?files=` +
          files.join(","),
      );
      return JSON.stringify(response.data);
    } catch (error) {
      return `Error reading files: Sandbox agent unreachable or file error. (${error.message})`;
    }
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
    try {
      if (!files || files.length === 0) {
        return "Error: You must provide at least one file to update. The 'files' array cannot be empty. Please actually provide the files and content.";
      }
      console.log(`[Tools] Sending update request for ${files.length} files to Sandbox...`);
      const response = await axios.patch(
        `http://sandbox-service-${config.configurable.projectId}:3000/update-files`,
        { updates: files },
      );
      console.log(`[Tools] Sandbox response:`, response.data.results);
      return JSON.stringify(response.data.results);
    } catch (error) {
      console.error(`[Tools] Error connecting to sandbox:`, error.message);
      return `Error updating files: Sandbox agent unreachable or file error. (${error.message})`;
    }
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

export const finishTask = tool(
  async () => {
    return "Task marked as finished. Code Reviewer will now review.";
  },
  {
    name: "finish_task",
    description:
      "Call this tool ONLY when you have successfully completed all file creations and updates requested by the user, and are ready for the Code Reviewer to evaluate your work.",
    schema: z.object({
      message: z.string().describe("A brief summary of what you accomplished."),
    }),
  },
);
