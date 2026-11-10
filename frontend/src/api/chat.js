import apiClient from './axios';

export const chatApi = {
  // Create a new conversation (library-wide or scoped to document_id)
  async createConversation({ title, documentId } = {}) {
    const payload = {};
    if (title) payload.title = title;
    if (documentId) payload.document_id = documentId;

    const response = await apiClient.post('/chat/conversations', payload);
    return response.data;
  },

  // List all conversations
  async listConversations(skip = 0, limit = 50) {
    const response = await apiClient.get('/chat/conversations', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Get full conversation history with messages and attached citations
  async getConversation(conversationId) {
    const response = await apiClient.get(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  // Send a message and get back assistant grounded response with citations
  async sendMessage(conversationId, content) {
    const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data;
  },

  // Delete a conversation
  async deleteConversation(conversationId) {
    const response = await apiClient.delete(`/chat/conversations/${conversationId}`);
    return response.data;
  },
};

