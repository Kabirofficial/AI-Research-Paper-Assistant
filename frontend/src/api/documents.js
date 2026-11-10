import apiClient, { baseURL } from './axios';

export const documentsApi = {
  // Upload and process PDF
  async upload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  // List all uploaded documents
  async list(skip = 0, limit = 50) {
    const response = await apiClient.get('/documents/', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Get metadata for a specific document
  async get(documentId) {
    const response = await apiClient.get(`/documents/${documentId}`);
    return response.data;
  },

  // Get extracted text (page by page and full text)
  async getText(documentId) {
    const response = await apiClient.get(`/documents/${documentId}/text`);
    return response.data;
  },

  // Get semantic chunks
  async getChunks(documentId) {
    const response = await apiClient.get(`/documents/${documentId}/chunks`);
    return response.data;
  },

  // Delete a document and its stored files
  async delete(documentId) {
    const response = await apiClient.delete(`/documents/${documentId}`);
    return response.data;
  },

  // Reprocess document
  async reprocess(documentId) {
    const response = await apiClient.post(`/documents/${documentId}/reprocess`);
    return response.data;
  },

  // Get direct download URL
  getDownloadUrl(documentId) {
    return `${baseURL}/documents/${documentId}/download`;
  },

  // Download PDF as blob with native download trigger
  async downloadBlob(documentId, filename = 'document.pdf') {
    const response = await apiClient.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
};

