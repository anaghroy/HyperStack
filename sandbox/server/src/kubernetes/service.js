import { K8sCoreV1Api } from "./config.js";

export const createService = async (sandboxId) => {
  // Define service manifest
  const serviceManifest = {
    metadata: {
      name: `sandbox-service-${sandboxId}`,
      labels: {
        sandboxId: sandboxId,
      },
    },
    spec: {
      selector: {
        sandboxId: sandboxId,
      },
      ports: [
        {
          name: "http",
          port: 80,
          targetPort: 5173,
          protocol: "TCP",
        },
        {
          name: "http-agent",
          port: 3000,
          targetPort: 3000,
          protocol: "TCP",
        },
      ],
      type: "ClusterIP",
    },
  };

  const serviceName = `sandbox-service-${sandboxId}`;

  // Check if service already exists
  let serviceExists = false;
  try {
    await K8sCoreV1Api.readNamespacedService({
      name: serviceName,
      namespace: "default",
    });
    serviceExists = true;
    console.log(`Service ${serviceName} already exists. Proceeding.`);
  } catch (error) {
    // Service doesn't exist, we will create it
  }

  // Create the service
  let response;
  if (!serviceExists) {
    try {
      response = await K8sCoreV1Api.createNamespacedService({
        namespace: "default",
        body: serviceManifest,
      });
    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
    }
  }

  return response;
};

export async function deleteService(sandboxId) {
  try {
    const response = await K8sCoreV1Api.deleteNamespacedService({
      name: `sandbox-service-${sandboxId}`,
      namespace: "default",
    });
    return response;
  } catch (error) {
    console.error("Error deleting service:", error);
    throw error;
  }
}
