import apiClient from './axios';

export const papersApi = {
  // Check if an academic summary was already generated and saved in SQLite
  async getSummary(documentId) {
    const response = await apiClient.get(`/papers/${documentId}/summary`);
    return response.data;
  },

  // Generate or retrieve a structured academic summary (supports caching & force_refresh)
  async summarize(documentId, { summaryType = 'comprehensive', forceRefresh = false } = {}) {
    const response = await apiClient.post(`/papers/${documentId}/summary`, {
      summary_type: summaryType,
      force_refresh: forceRefresh,
    });
    return response.data;
  },

  // Compare 2 to 10 research papers and persist comparison in SQLite
  async compare({ documentIds, title } = {}) {
    const payload = { document_ids: documentIds };
    if (title && title.trim()) {
      payload.title = title.trim();
    }
    const response = await apiClient.post('/papers/compare', payload);
    return response.data;
  },

  // List all saved comparisons with pagination
  async listComparisons(skip = 0, limit = 50) {
    const response = await apiClient.get('/papers/comparisons', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Retrieve a previously saved comparative analysis by ID
  async getComparison(comparisonId) {
    const response = await apiClient.get(`/papers/comparisons/${comparisonId}`);
    return response.data;
  },

  // Delete a saved comparison from SQLite
  async deleteComparison(comparisonId) {
    const response = await apiClient.delete(`/papers/comparisons/${comparisonId}`);
    return response.data;
  },
};
