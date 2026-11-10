import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import { settingsApi } from '../api/settings';
import { searchApi } from '../api/search';
import { useBackendStatus } from '../context/BackendStatusContext';
import { useToast } from '../context/ToastContext';
import {
  Bot,
  Cpu,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

export default function Settings() {
  const { setMobileOpen } = useOutletContext();
  const { checkHealth } = useBackendStatus();
  const { success, error, info } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);

  // Form states
  const [llmProvider, setLlmProvider] = useState('ollama');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2:latest');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Retrieval states
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(120);
  const [topK, setTopK] = useState(5);
  const [embeddingModel, setEmbeddingModel] = useState('BAAI/bge-small-en-v1.5');
  const [maxUploadMB, setMaxUploadMB] = useState(50);

  // Live Provider & Vector status
  const [providersData, setProvidersData] = useState(null);
  const [vectorStatus, setVectorStatus] = useState(null);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      const [currentSettings, providers, vStatus] = await Promise.all([
        settingsApi.get(),
        settingsApi.getProviders().catch(() => null),
        searchApi.getStatus().catch(() => null),
      ]);

      setLlmProvider(currentSettings.llm_provider || 'ollama');
      setOllamaBaseUrl(currentSettings.ollama_base_url || 'http://localhost:11434');
      setOllamaModel(currentSettings.ollama_model || 'llama3.2:latest');
      setOpenaiModel(currentSettings.openai_model || 'gpt-4o-mini');
      setApiKeyMasked(currentSettings.openai_api_key_masked || '');
      setIsApiKeyConfigured(currentSettings.openai_api_key_configured || false);

      setChunkSize(currentSettings.chunk_size || 800);
      setChunkOverlap(currentSettings.chunk_overlap || 120);
      setTopK(currentSettings.top_k_retrieval || 5);
      setEmbeddingModel(currentSettings.embedding_model || 'BAAI/bge-small-en-v1.5');
      setMaxUploadMB(currentSettings.max_upload_size_mb || 50);

      setProvidersData(providers);
      setVectorStatus(vStatus);
    } catch (err) {
      error(err.message || 'Failed to fetch application settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = {
        llm_provider: llmProvider,
        ollama_base_url: ollamaBaseUrl,
        ollama_model: ollamaModel,
        openai_model: openaiModel,
        chunk_size: parseInt(chunkSize, 10),
        chunk_overlap: parseInt(chunkOverlap, 10),
        top_k_retrieval: parseInt(topK, 10),
      };

      if (openaiApiKey.trim()) {
        payload.openai_api_key = openaiApiKey.trim();
      }

      await settingsApi.update(payload);
      success('Runtime settings saved.');
      setOpenaiApiKey('');
      checkHealth();
      loadAllSettings();
    } catch (err) {
      error(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    try {
      const res = await settingsApi.testConnection({
        provider: 'ollama',
        base_url: ollamaBaseUrl,
        model: ollamaModel,
      });
      if (res.success) {
        success(`Ollama online (${res.latency_ms}ms)`);
      } else {
        error(res.message);
      }
    } catch (err) {
      error(err.message || 'Ollama test failed.');
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleTestOpenAI = async () => {
    setIsTestingOpenAI(true);
    try {
      const res = await settingsApi.testConnection({
        provider: 'openai',
        model: openaiModel,
        api_key: openaiApiKey.trim() || undefined,
      });
      if (res.success) {
        success(`OpenAI online (${res.latency_ms}ms)`);
      } else {
        error(res.message);
      }
    } catch (err) {
      error(err.message || 'OpenAI test failed.');
    } finally {
      setIsTestingOpenAI(false);
    }
  };

  const handleRebuildIndex = async () => {
    setIsRebuildingIndex(true);
    info('Re-embedding all chunks and writing clean FAISS index...');
    try {
      const res = await searchApi.rebuild();
      success(res.message || 'Vector store rebuilt successfully.');
      const vStatus = await searchApi.getStatus();
      setVectorStatus(vStatus);
    } catch (err) {
      error(err.message || 'Failed to rebuild vector index.');
    } finally {
      setIsRebuildingIndex(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header setMobileOpen={setMobileOpen} pageTitle="Settings" />
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle="System Settings"
        pageSubtitle="RUNTIME INFERENCE PROVIDERS // RETRIEVAL HYPERPARAMETERS"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={handleSaveSettings}
            isLoading={isSaving}
          >
            Save Configuration
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 font-mono text-xs">
        {/* Provider Selection */}
        <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4">
          <div className="pb-3 border-b border-cream-border dark:border-warmdark-border">
            <h3 className="font-bold uppercase text-cream-text dark:text-warmdark-text font-display text-sm">
              [01] ACTIVE_LLM_PROVIDER
            </h3>
            <p className="text-cream-muted dark:text-warmdark-muted font-sans mt-0.5">
              Select between offline local inference (Ollama) and cloud inference (OpenAI)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ollama */}
            <div
              onClick={() => setLlmProvider('ollama')}
              className={`p-4 border rounded-sm cursor-pointer transition-all ${
                llmProvider === 'ollama'
                  ? 'border-sky-primary bg-sky-pale/50 dark:bg-sky-deep/20 text-cream-text dark:text-warmdark-text shadow-editorial-sm font-bold'
                  : 'border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted hover:border-charcoal-main'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5 uppercase font-display">
                  <Cpu className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                  OLLAMA (LOCAL)
                </span>
                {llmProvider === 'ollama' && (
                  <Badge variant="sky" size="xs">ACTIVE</Badge>
                )}
              </div>
              <p className="text-[11px] font-sans text-cream-muted dark:text-warmdark-muted">
                100% offline, zero data leakage, local models (Llama 3.2, Qwen, Mistral).
              </p>
            </div>

            {/* OpenAI */}
            <div
              onClick={() => setLlmProvider('openai')}
              className={`p-4 border rounded-sm cursor-pointer transition-all ${
                llmProvider === 'openai'
                  ? 'border-sky-primary bg-sky-pale/50 dark:bg-sky-deep/20 text-cream-text dark:text-warmdark-text shadow-editorial-sm font-bold'
                  : 'border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted hover:border-charcoal-main'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-1.5 uppercase font-display">
                  <Bot className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                  OPENAI API (CLOUD)
                </span>
                {llmProvider === 'openai' && (
                  <Badge variant="sky" size="xs">ACTIVE</Badge>
                )}
              </div>
              <p className="text-[11px] font-sans text-cream-muted dark:text-warmdark-muted">
                Cloud inference via personal OpenAI API key (GPT-4o-mini, GPT-4o).
              </p>
            </div>
          </div>
        </div>

        {/* Ollama Settings */}
        <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border dark:border-warmdark-border">
            <div>
              <h3 className="font-bold uppercase text-cream-text dark:text-warmdark-text font-display text-sm">
                [02] OLLAMA_DAEMON_SETTINGS
              </h3>
              <p className="text-cream-muted dark:text-warmdark-muted font-sans mt-0.5">
                Local inference endpoint and active model tag
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={handleTestOllama}
              isLoading={isTestingOllama}
            >
              PING_OLLAMA
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                OLLAMA_BASE_URL
              </label>
              <input
                type="text"
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none focus:border-charcoal-main dark:focus:border-sky-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                OLLAMA_MODEL_TAG
              </label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="llama3.2:latest"
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none focus:border-charcoal-main dark:focus:border-sky-primary"
              />
            </div>
          </div>
        </div>

        {/* OpenAI Settings */}
        <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border dark:border-warmdark-border">
            <div>
              <h3 className="font-bold uppercase text-cream-text dark:text-warmdark-text font-display text-sm">
                [03] OPENAI_API_SETTINGS
              </h3>
              <p className="text-cream-muted dark:text-warmdark-muted font-sans mt-0.5">
                Cloud inference credentials (masked securely)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={handleTestOpenAI}
              isLoading={isTestingOpenAI}
            >
              PING_OPENAI
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase flex items-center justify-between">
                <span>OPENAI_API_KEY</span>
                {isApiKeyConfigured && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    CONFIGURED [{apiKeyMasked}]
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder={isApiKeyConfigured ? 'ENTER NEW KEY TO OVERWRITE' : 'sk-...'}
                  className="w-full pl-3 pr-10 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none focus:border-charcoal-main dark:focus:border-sky-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-muted dark:text-warmdark-muted hover:text-charcoal-main cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                OPENAI_MODEL
              </label>
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none cursor-pointer"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (RECOMMENDED // FAST & ACCURATE)</option>
                <option value="gpt-4o">gpt-4o (HIGH INTELLIGENCE)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo (LEGACY)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Retrieval Parameters */}
        <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4">
          <div className="pb-3 border-b border-cream-border dark:border-warmdark-border">
            <h3 className="font-bold uppercase text-cream-text dark:text-warmdark-text font-display text-sm">
              [04] RETRIEVAL_HYPERPARAMETERS
            </h3>
            <p className="text-cream-muted dark:text-warmdark-muted font-sans mt-0.5">
              Tune chunking token sizes and top-k context depth
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                CHUNK_SIZE (TOKENS)
              </label>
              <input
                type="number"
                min="100"
                max="4000"
                value={chunkSize}
                onChange={(e) => setChunkSize(e.target.value)}
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none"
              />
              <p className="text-[10px] text-cream-muted dark:text-warmdark-muted">// DEFAULT: 800 TOKENS</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                CHUNK_OVERLAP (TOKENS)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(e.target.value)}
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none"
              />
              <p className="text-[10px] text-cream-muted dark:text-warmdark-muted">// DEFAULT: 120 TOKENS</p>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                TOP_K_RETRIEVAL
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none"
              />
              <p className="text-[10px] text-cream-muted dark:text-warmdark-muted">// CONTEXT PASSAGES FOR RAG</p>
            </div>
          </div>
        </div>

        {/* FAISS Vector Store Status */}
        <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border dark:border-warmdark-border">
            <div>
              <h3 className="font-bold uppercase text-cream-text dark:text-warmdark-text font-display text-sm">
                [05] FAISS_VECTOR_STORE
              </h3>
              <p className="text-cream-muted dark:text-warmdark-muted font-sans mt-0.5">
                Dense similarity index health and rebuilding
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={handleRebuildIndex}
              isLoading={isRebuildingIndex}
            >
              REBUILD_INDEX
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border border-cream-border dark:border-warmdark-border bg-cream-secondary/30 dark:bg-warmdark-elevated rounded-sm text-xs">
            <div>
              <p className="text-cream-muted dark:text-warmdark-muted font-bold uppercase">TOTAL VECTORS</p>
              <p className="text-xl font-black text-cream-text dark:text-warmdark-text mt-1 font-display">
                {vectorStatus?.total_vectors ?? 0}
              </p>
            </div>

            <div>
              <p className="text-cream-muted dark:text-warmdark-muted font-bold uppercase">DIMENSION</p>
              <p className="text-xl font-black text-cream-text dark:text-warmdark-text mt-1 font-display">
                {vectorStatus?.dimension || 384}d
              </p>
            </div>

            <div>
              <p className="text-cream-muted dark:text-warmdark-muted font-bold uppercase">EMBED MODEL</p>
              <p className="text-xs font-bold text-cream-text dark:text-warmdark-text mt-1 truncate">
                BGE-SMALL
              </p>
            </div>

            <div>
              <p className="text-cream-muted dark:text-warmdark-muted font-bold uppercase">INDEX HEALTH</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                [{vectorStatus?.is_healthy ? 'HEALTHY' : 'READY'}]
              </p>
            </div>
          </div>
        </div>

        {/* About & Support Card */}
        <div className="border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface p-5 rounded-xs space-y-4 shadow-editorial-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black uppercase text-cream-text dark:text-warmdark-text tracking-wide font-display">
                About & Support
              </h2>
              <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1">
                AI Research Paper Assistant is an open-source, local-first academic research tool.
              </p>
            </div>
            <a
              href="https://www.buymeacoffee.com/JinggXD"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block transition-transform hover:scale-105 shrink-0"
            >
              <img
                src="https://img.buymeacoffee.com/button-api/?text=Buy me a book&emoji=📖&slug=JinggXD&button_colour=5F7FFF&font_colour=ffffff&font_family=Comic&outline_colour=000000&coffee_colour=FFDD00"
                alt="Buy me a book"
                className="h-10"
              />
            </a>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="lg"
            icon={Save}
            onClick={handleSaveSettings}
            isLoading={isSaving}
            className="uppercase"
          >
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
