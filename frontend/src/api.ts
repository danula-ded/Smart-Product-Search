export type UploadMode = 'replace_all' | 'upsert_ste' | 'append_contracts' | 'upsert_bundle';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const payload = await response.json();
      detail = payload.detail ?? JSON.stringify(payload);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export async function getHealth() {
  return parseResponse<{ status: string; version: string }>(await fetch('/health'));
}

export async function getDatasetSummary() {
  return parseResponse<any>(await fetch('/datasets/summary'));
}

export async function getDemoProfiles() {
  return parseResponse<any[]>(await fetch('/profiles/demo'));
}

export async function getMetrics() {
  return parseResponse<any>(await fetch('/metrics/summary'));
}

export async function uploadDatasets(
  mode: UploadMode,
  steFile?: File | null,
  contractsFile?: File | null,
) {
  const formData = new FormData();
  formData.append('mode', mode);
  if (steFile) formData.append('ste_file', steFile);
  if (contractsFile) formData.append('contracts_file', contractsFile);
  return parseResponse<{ jobId: string }>(
    await fetch('/datasets/upload', { method: 'POST', body: formData }),
  );
}

export async function getJob(jobId: string) {
  return parseResponse<any>(await fetch(`/datasets/jobs/${jobId}`));
}

export async function bootstrapDefaultDataset() {
  return parseResponse<{ success: boolean; message?: string; jobId?: string }>(
    await fetch('/datasets/bootstrap-default', { method: 'POST' }),
  );
}

export async function clearDataset() {
  return parseResponse<{ success: boolean; message?: string }>(
    await fetch('/datasets/clear', { method: 'POST' }),
  );
}

export async function searchProducts(payload: Record<string, unknown>) {
  return parseResponse<any>(
    await fetch('/search', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );
}

export async function sendEvent(payload: Record<string, unknown>) {
  return parseResponse<any>(
    await fetch('/events', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }),
  );
}
