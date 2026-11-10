import apiClient from './axios';

export const searchApi = {
  // Dense semantic search across papers
  async search({ query, documentId, documentIds, topK = 5, minScore = 0.0 }) {
    const payload = {
      query,
      top_k: topK,
      min_score: minScore,
    };
    if (documentId) payload.document_id = documentId;
    if (documentIds && documentIds.length) payload.document_ids = documentIds;

    const response = await apiClient.post('/search/', payload);
    return response.data;
  },

  // FAISS vector store status
  async getStatus() {
    const response = await apiClient.get('/search/status');
    return response.data;
  },

  // Rebuild vector index from SQLite database chunks
  async rebuild() {
    const response = await apiClient.post('/search/rebuild');
    return response.data;
  },
};

