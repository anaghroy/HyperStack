import React, { useState } from "react";
import { generateIntentAPI, updateFile } from "../../services/api";
import { Wand, Save, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import Editor from "@monaco-editor/react";

const EditorIntentHub = () => {
  const [intent, setIntent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [filename, setFilename] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerate = async () => {
    if (!intent.trim()) return;

    setIsLoading(true);
    setGeneratedCode("");
    try {
      const data = await generateIntentAPI(intent);
      setGeneratedCode(data.code);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate code from intent");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!filename.trim()) {
      toast.error("Please enter a filename (e.g. src/auth.js)");
      return;
    }
    if (!generatedCode.trim()) {
      toast.error("No code generated yet.");
      return;
    }

    setIsSaving(true);
    try {
      await updateFile(filename, generatedCode);
      toast.success(`Successfully saved to ${filename}!`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to save file: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setIsCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className="editor-intent-hub"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
      }}
    >
      {/* Left Pane - Intent Input */}
      <div
        style={{
          width: "350px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-secondary)",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Wand size={18} color="var(--color-accent)" />
          <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>
            Intent-Driven Dev
          </h2>
        </div>

        <div
          style={{
            flex: 1,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <label style={{ fontSize: "13px", fontWeight: 500 }}>
            What do you want to build?
          </label>
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              margin: "-8px 0 0 0",
              lineHeight: 1.4,
            }}
          >
            Describe the feature, component, or logic you need in plain English.
            The AI will generate production-ready code.
          </p>

          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Create an Express.js middleware that verifies JWT tokens and checks user roles..."
            style={{
              flex: 1,
              background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              padding: "12px",
              fontSize: "13px",
              resize: "none",
              fontFamily: "inherit",
              outline: "none",
              lineHeight: 1.5,
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={isLoading || !intent.trim()}
            style={{
              background: "var(--color-accent)",
              color: "white",
              border: "none",
              padding: "12px",
              borderRadius: "6px",
              cursor: isLoading || !intent.trim() ? "not-allowed" : "pointer",
              opacity: isLoading || !intent.trim() ? 0.6 : 1,
              fontWeight: 500,
              transition: "opacity 0.2s",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isLoading ? (
              <>
                <div
                  className="loader"
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Generating Code...
              </>
            ) : (
              <>
                <Wand size={16} /> Generate Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Pane - Code Viewer & Actions */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-bg-primary)",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flex: 1,
              maxWidth: "400px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 500 }}>Save to:</span>
            <input
              type="text"
              placeholder="e.g. src/middleware/auth.js"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              style={{
                flex: 1,
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                padding: "6px 10px",
                borderRadius: "4px",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              onClick={handleSaveFile}
              disabled={!generatedCode || !filename || isSaving}
              style={{
                background: "var(--color-success, #10b981)",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor:
                  !generatedCode || !filename || isSaving
                    ? "not-allowed"
                    : "pointer",
                opacity: !generatedCode || !filename || isSaving ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              <Save size={14} /> {isSaving ? "Saving..." : "Save File"}
            </button>
          </div>

          <button
            onClick={handleCopy}
            disabled={!generatedCode}
            style={{
              background: "transparent",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: !generatedCode ? "not-allowed" : "pointer",
              opacity: !generatedCode ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
            }}
          >
            {isCopied ? (
              <Check size={14} color="#10b981" />
            ) : (
              <Copy size={14} />
            )}
            {isCopied ? "Copied!" : "Copy Code"}
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, position: "relative" }}>
          {generatedCode ? (
            <Editor
              height="100%"
              language={
                filename.endsWith(".jsx") || filename.endsWith(".js")
                  ? "javascript"
                  : filename.endsWith(".ts")
                    ? "typescript"
                    : "javascript"
              }
              theme="vs-dark"
              value={generatedCode}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: "on",
              }}
            />
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
                gap: "16px",
              }}
            >
              {isLoading ? (
                <span>Writing production-ready code...</span>
              ) : (
                <>
                  <Wand size={48} opacity={0.2} />
                  <span>Enter an intent on the left to generate code.</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorIntentHub;
