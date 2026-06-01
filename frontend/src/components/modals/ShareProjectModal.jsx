import React, { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { shareProjectAPI } from "../../services/api";
import toast from "react-hot-toast";

const ShareProjectModal = ({ isOpen, onClose, activeProject }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim() || !activeProject) return;

    setLoading(true);
    try {
      const data = await shareProjectAPI(activeProject._id, email, role);
      toast.success(data.message || "Project shared successfully!");
      setEmail("");
      setRole("Editor");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to share project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content share-modal">
        <div className="modal-header">
          <div
            className="modal-title"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <UserPlus size={20} />
            <h3 style={{ margin: 0 }}>Share Project</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleShare} className="modal-body">
          <p className="modal-desc">
            Invite collaborators to{" "}
            <strong>{activeProject?.title || "this project"}</strong>.
          </p>

          <div className="form-group">
            <label>Collaborator Email</label>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Permission Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                borderRadius: "6px",
                outline: "none",
              }}
            >
              <option
                style={{ backgroundColor: "#2d3748", color: "#fff" }}
                value="Editor"
              >
                Editor (Can edit files)
              </option>
              <option
                style={{ backgroundColor: "#2d3748", color: "#fff" }}
                value="Viewer"
              >
                Viewer (Read-only access)
              </option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={!email.trim() || loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareProjectModal;
