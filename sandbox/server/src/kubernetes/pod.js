import { K8sCoreV1Api } from "./config.js";

export async function createPod(sandboxId, githubUrl = "", installCmd = "", startCmd = "", port = 5173) {
  // Define init command for template copying
  const templateInitCommand = `if [ -z "$(ls -A /seed 2>/dev/null)" ]; then cp -a /workspace/. /seed/ || cp -r /workspace/* /seed/; fi`;

  // Define main container command
  let mainCommand = `cd /workspace && npm run dev -- --host 0.0.0.0`;
  if (githubUrl) {
    if (startCmd) {
      const install = installCmd ? installCmd : "npm install --legacy-peer-deps";
      mainCommand = `cd /workspace && export PORT=${port} && export HOST=0.0.0.0 && ${install} && ${startCmd} || tail -f /dev/null`;
    } else {
      mainCommand = `
        cd /workspace
        
        if [ ! -f "package.json" ]; then
          for dir in frontend Frontend client Client web Web; do
            if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
              cd "$dir"
              break
            fi
          done
        fi

        if [ -f "package.json" ]; then
          if grep -q '"vite"' package.json; then
            PORT=${port} npm install --legacy-peer-deps && PORT=${port} npm run dev -- --host 0.0.0.0 --port ${port} || tail -f /dev/null
          elif grep -q '"next"' package.json; then
            PORT=${port} npm install --legacy-peer-deps && PORT=${port} npm run dev -- -H 0.0.0.0 -p ${port} || tail -f /dev/null
          elif grep -q '"react-scripts"' package.json; then
            PORT=${port} HOST=0.0.0.0 npm install --legacy-peer-deps && PORT=${port} HOST=0.0.0.0 npm start || tail -f /dev/null
          else
            PORT=${port} HOST=0.0.0.0 npm install --legacy-peer-deps && PORT=${port} HOST=0.0.0.0 npm start || tail -f /dev/null
          fi
        else
          tail -f /dev/null
        fi
      `;
    }
  }

  // Define Pod Manifest
  const podManifest = {
    metadata: {
      name: `sandbox-pod-${sandboxId}`,
      labels: {
        sandboxId: sandboxId,
        role: "sandbox",
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
          image: "template:latest",
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
          image: "template:latest",
          imagePullPolicy: "IfNotPresent",
          name: "sandbox-container",
          command: ["sh", "-c", mainCommand],
          ports: [{ containerPort: port, name: "http" }],
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
          image: "agent:latest",
          imagePullPolicy: "IfNotPresent",
          name: "agent-container",
          ports: [{ containerPort: 3000, name: "http-agent" }],
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

  const podName = `sandbox-pod-${sandboxId}`;

  // Check if pod already exists
  let podExists = false;
  try {
    await K8sCoreV1Api.readNamespacedPod({
      name: podName,
      namespace: "default",
    });
    podExists = true;
    console.log(`Pod ${podName} already exists. Proceeding.`);
  } catch (error) {
    // Pod doesn't exist, we will create it
  }

  let response;
  if (!podExists) {
    // Create the pod in the default namespace
    try {
      response = await K8sCoreV1Api.createNamespacedPod({
        namespace: "default",
        body: podManifest,
      });
    } catch (error) {
      console.error("Error creating pod:", error);
      throw error;
    }
  }
  
  // Wait for the Pod to get an IP address
  let podIp = null;
  while (!podIp) {
    try {
      const podInfo = await K8sCoreV1Api.readNamespacedPod({
        name: podName,
        namespace: "default",
      });
      // @kubernetes/client-node might return { body, response } or just the object
      const data = podInfo.body || podInfo;
      podIp = data.status?.podIP;
      if (!podIp) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.log(`Waiting for pod ${podName} to exist...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { response, podIp };
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
