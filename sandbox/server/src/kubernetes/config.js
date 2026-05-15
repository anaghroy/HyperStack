import * as K8sApi from "@kubernetes/client-node";

const kc = new K8sApi.KubeConfig();
kc.loadFromDefault();

export const K8sCoreV1Api = kc.makeApiClient(K8sApi.CoreV1Api); //for pods, services, deployments etc.
