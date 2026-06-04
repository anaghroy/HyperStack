import { K8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId, githubUrl = "") {
  // Define init command for template copying
  const templateInitCommand = `if [ -z "$(ls -A /seed 2>/dev/null)" ]; then cp -r /workspace/. /seed/; fi`;

  // Define main container command
  const mainCommand = githubUrl
    ? `npm install && npm run dev -- --host 0.0.0.0 || tail -f /dev/null`
    : `npm run dev -- --host 0.0.0.0`;

  // Define Pod Manifest
  const podManifest = {
    metadata: {
      name: `sandbox-pod-${sandboxId}`,
      labels: {
        sandboxId: sandboxId,
      },
    },
    spec: {
      volumes: [
        {
          name: "workspace-volume",
          emptyDir: {},
        },
      ],
      initContainers: [
        {
          name: "git-clone",
          image: "alpine/git",
          imagePullPolicy: "IfNotPresent",
          command: ["sh", "-c", githubUrl ? `git clone ${githubUrl} /tmp/repo 2> /seed/git-error.txt && cp -a /tmp/repo/. /seed/ || true` : "true"],
          volumeMounts: [
            {
              name: "workspace-volume",
              mountPath: "/seed",
            },
          ],
        },
        {
          name: "init-template",
          image: "template",
          imagePullPolicy: "IfNotPresent",
          command: ["sh", "-c", templateInitCommand],
          volumeMounts: [
            {
              name: "workspace-volume",
              mountPath: "/seed",
            },
          ],
        },
      ],
      containers: [
        {
          image: "template",
          imagePullPolicy: "IfNotPresent",
          name: "sandbox-container",
          command: ["sh", "-c", mainCommand],
          ports: [{ containerPort: 5173, name: "http" }],
          resources: {
            limits: { cpu: "500m", memory: "1Gi" },
            requests: { cpu: "50m", memory: "100Mi" },
          },
          volumeMounts: [
            {
              name: "workspace-volume",
              mountPath: "/workspace",
            },
          ],
        },
        {
          image: "agent:v2",
          imagePullPolicy: "IfNotPresent",
          name: "agent-container",
          ports: [{ containerPort: 3000, name: "http" }],
          resources: {
            limits: { cpu: "500m", memory: "1Gi" },
            requests: { cpu: "50m", memory: "100Mi" },
          },
          volumeMounts: [
            {
              name: "workspace-volume",
              mountPath: "/workspace",
            },
          ],
        },
      ],
    },
  };

  // Create the pod in the default namespace
  const response = await K8sCoreV1Api.createNamespacedPod({
    namespace: "default",
    body: podManifest,
  });

  return response;
}

export async function deletePod(sandboxId) {
  try {
    const response = await K8sCoreV1Api.deleteNamespacedPod({
      name: `sandbox-pod-${sandboxId}`,
      namespace: "default",
    }, {gracePeriodSeconds: 0}); // Force delete the pod immediately
    return response;
  } catch (error) {
    console.error("Error deleting pod:", error);
    throw error;
  }
}
