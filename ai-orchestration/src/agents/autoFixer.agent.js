import axios from "axios";
import { getModel } from "../models/index.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const runAutoFixer = async (projectId) => {
  try {
    // 1. Run the linter in the sandbox
    const linterResponse = await axios.get(`http://sandbox-service-${projectId}:3000/run-linter`);
    
    if (!linterResponse.data.success || !linterResponse.data.results) {
      throw new Error("Linter failed to return results");
    }

    const lintErrors = linterResponse.data.results.filter(file => file.errorCount > 0 || file.warningCount > 0);
    
    if (lintErrors.length === 0) {
      return { status: "success", message: "No linting errors found." };
    }

    // 2. Fetch the source code for files with errors
    const filesToFix = lintErrors.map(file => file.filePath.replace("/workspace/", ""));
    const filesResponse = await axios.get(`http://sandbox-service-${projectId}:3000/read-files?files=${filesToFix.join(',')}`);
    
    const fileContents = filesResponse.data.files;
    
    // 3. Construct prompt for the AI to fix the code
    const prompt = `You are an automated code fixing agent. Your job is to resolve ESLint errors.
Here are the files and their corresponding lint errors:

${lintErrors.map((fileError, i) => {
  const relPath = fileError.filePath.replace("/workspace/", "");
  const contentObj = fileContents.find(f => f[relPath]);
  const content = contentObj ? contentObj[relPath] : "// File content could not be read";
  
  return `--- FILE: ${relPath} ---
ERRORS:
${fileError.messages.map(m => `- Line ${m.line}: ${m.message} (${m.ruleId})`).join("\n")}

CURRENT CONTENT:
${content}
`;
}).join("\n\n")}

Return ONLY a JSON array of objects representing the fully fixed files. Do NOT use markdown code blocks (\`\`\`json). Just the raw JSON. 
Format:
[
  {
    "file": "path/to/file.js",
    "content": "// the entire fixed file content"
  }
]
`;

    // 4. Invoke model to get fixes
    const model = getModel(process.env.AI_MODEL || "orchestrator");
    const aiResponse = await model.invoke([
      new SystemMessage("You are a strict JSON-only AI auto-fixer."),
      new HumanMessage(prompt)
    ]);

    let fixedFilesPayload;
    try {
      // Strip any accidental markdown formatting the model might include
      const cleanJson = aiResponse.content.replace(/```json/g, "").replace(/```/g, "").trim();
      fixedFilesPayload = JSON.parse(cleanJson);
    } catch (err) {
      throw new Error("AI returned invalid JSON format for fixes.");
    }

    // 5. Apply the fixes to the sandbox
    if (fixedFilesPayload && Array.isArray(fixedFilesPayload) && fixedFilesPayload.length > 0) {
      await axios.patch(`http://sandbox-service-${projectId}:3000/update-files`, {
        updates: fixedFilesPayload
      });
      return { status: "success", message: `Fixed ${fixedFilesPayload.length} files.` };
    }

    return { status: "success", message: "No fixes applied." };
    
  } catch (error) {
    console.error("Auto-fixer failed:", error);
    throw new Error(`Auto-fixer failed: ${error.message}`);
  }
};
