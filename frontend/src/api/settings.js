import apiClient from './axios';

export const settingsApi = {
  // Get current application configuration
  async get() {
    const response = await apiClient.get('/settings/');
    return response.data;
  },

  // Update application configuration at runtime
  async update(updateData) {
    const response = await apiClient.put('/settings/', updateData);
    return response.data;
  },

  // Get provider status and installed models
  async getProviders() {
    const response = await apiClient.get('/settings/providers');
    return response.data;
  },

  // Test provider connection
  async testConnection({ provider, model, baseUrl, apiKey } = {}) {
    const payload = {};
    if (provider) payload.provider = provider;
    if (model) payload.model = model;
    if (baseUrl) payload.base_url = baseUrl;
    if (apiKey) payload.api_key = apiKey;

    const response = await apiClient.post('/settings/test-connection', payload);
    return response.data;
  },

  // Health check endpoint
  async health() {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

