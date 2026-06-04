import React, { useState } from "react";
import MermaidViewer from "./MermaidViewer";
import { generateDbSchemaAPI } from "../../services/api";
import Editor from "@monaco-editor/react";

const DatabaseDesignerHub = () => {
  const [prompt, setPrompt] = useState("");
  const [orm, setOrm] = useState("mongoose");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateDbSchemaAPI(prompt, orm);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate schema");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="db-designer-hub"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "var(--color-bg-primary)",
        color: "var(--color-text-primary)",
      }}
    >
      <div
        className="db-designer-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 500 }}>
          NL to DB Schema
        </h2>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <label
            style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
          >
            ORM:
          </label>
          <select
            value={orm}
            onChange={(e) => setOrm(e.target.value)}
            style={{
              background: "var(--color-bg-secondary)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              padding: "4px 8px",
              borderRadius: "4px",
              outline: "none",
              fontSize: "13px",
            }}
          >
            <option
              style={{
                background: "#1E1E1E",
                color: "var(--color-text-primary)",
              }}
              value="mongoose"
            >
              Mongoose
            </option>
            <option
              style={{
                background: "#1E1E1E",
                color: "var(--color-text-primary)",
              }}
              value="prisma"
            >
              Prisma
            </option>
            <option
              style={{
                background: "#1E1E1E",
                color: "var(--color-text-primary)",
              }}
              value="sequelize"
            >
              Sequelize
            </option>
          </select>
        </div>
      </div>

      <div
        className="db-designer-content"
        style={{ display: "flex", flex: 1, overflow: "hidden" }}
      >
        {/* Left Pane - Prompt */}
        <div
          className="db-designer-left"
          style={{
            width: "300px",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              padding: "16px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <label style={{ fontSize: "13px", fontWeight: 500 }}>
              Describe your database:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. An e-commerce app with users, products, and orders..."
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.2)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                padding: "12px",
                fontSize: "13px",
                resize: "none",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              style={{
                background: "var(--color-accent)",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "6px",
                cursor: isLoading || !prompt.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !prompt.trim() ? 0.6 : 1,
                fontWeight: 500,
                transition: "opacity 0.2s",
              }}
            >
              {isLoading ? "Generating..." : "Generate Schema"}
            </button>
            {error && (
              <div
                style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Results Split */}
        <div
          className="db-designer-right"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {result ? (
            <>
              {/* Top - Code */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "300px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    background: "var(--color-bg-secondary)",
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  Generated {orm.charAt(0).toUpperCase() + orm.slice(1)} Code
                </div>
                <div style={{ flex: 1 }}>
                  <Editor
                    height="100%"
                    language={orm === "prisma" ? "prisma" : "javascript"}
                    theme="vs-dark"
                    value={result.code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Bottom - ER Diagram */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "300px",
                  background: "#f3f4f6",
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    background: "#f3f4f6",
                    fontSize: "12px",
                    color: "#d1d5db",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  ER Diagram (Mermaid)
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
                  <MermaidViewer chart={result.mermaid} />
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {isLoading ? (
                <>
                  <div
                    className="loader"
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "2px solid rgba(255,255,255,0.1)",
                      borderTopColor: "var(--color-accent)",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span>Designing Database Architecture...</span>
                </>
              ) : (
                <span>
                  Enter a description on the left to generate a database schema.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseDesignerHub;
