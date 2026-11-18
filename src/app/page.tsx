'use client';

import React, { useEffect, useState } from 'react';
import {
  Zap,
  Link2,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  X,
  Server,
  CloudLightning,
  Sparkles,
  MousePointerClick,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ShortLink, StorageStatus } from '@/lib/types';
import { sanitizeSlug } from '@/lib/utils';

export default function DashboardPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [search, setSearch] = useState('');
  const [notFoundSlug, setNotFoundSlug] = useState<string | null>(null);

  // Form states
  const [targetUrl, setTargetUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied feedback state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // QR Code Modal state
  const [qrModal, setQrModal] = useState<{ open: boolean; link: ShortLink | null; dataUrl: string | null }>({
    open: false,
    link: null,
    dataUrl: null,
  });
  const [loadingQr, setLoadingQr] = useState(false);

  // Edit Modal state
  const [editModal, setEditModal] = useState<{
    open: boolean;
    link: ShortLink | null;
    targetUrl: string;
    title: string;
  }>({
    open: false,
    link: null,
    targetUrl: '',
    title: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Deploy guide modal state
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      const nf = params.get('not_found');
      if (nf) {
        setNotFoundSlug(nf);
      }
    }
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      setLoading(true);
      const res = await fetch('/api/links');
      const data = await res.json();
      if (data.success) {
        setLinks(data.data.links || []);
        setStorage(data.data.storage || null);
      }
    } catch (err) {
      console.error('Falha ao carregar links:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!targetUrl.trim()) {
      setFormError('Por favor, informe a URL de destino.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: targetUrl.trim(),
          code: customSlug.trim() || undefined,
          title: title.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || 'Erro ao criar o link encurtado.');
        return;
      }

      setFormSuccess(`Link criado com sucesso: /${data.data.code}`);
      setTargetUrl('');
      setCustomSlug('');
      setTitle('');
      fetchLinks();
    } catch {
      setFormError('Erro de conexão ao criar link.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(link: ShortLink) {
    try {
      const updatedStatus = !link.isActive;
      // Optimistic update
      setLinks((prev) =>
        prev.map((l) => (l.code === link.code ? { ...l, isActive: updatedStatus } : l))
      );

      const res = await fetch(`/api/links/${link.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updatedStatus }),
      });

      if (!res.ok) {
        fetchLinks();
      }
    } catch {
      fetchLinks();
    }
  }

  async function handleDelete(code: string) {
    if (!window.confirm(`Tem certeza que deseja excluir o link "/${code}"?`)) {
      return;
    }

    try {
      setLinks((prev) => prev.filter((l) => l.code !== code));
      await fetch(`/api/links/${code}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Erro ao excluir link:', err);
      fetchLinks();
    }
  }

  async function handleOpenQr(link: ShortLink) {
    setQrModal({ open: true, link, dataUrl: null });
    setLoadingQr(true);
    try {
      const fullUrl = `${origin}/${link.code}`;
      const res = await fetch(`/api/qr?url=${encodeURIComponent(fullUrl)}`);
      const data = await res.json();
      if (data.success && data.dataUrl) {
        setQrModal({ open: true, link, dataUrl: data.dataUrl });
      }
    } catch (err) {
      console.error('Erro ao gerar QR code:', err);
    } finally {
      setLoadingQr(false);
    }
  }

  function handleOpenEdit(link: ShortLink) {
    setEditModal({
      open: true,
      link,
      targetUrl: link.targetUrl,
      title: link.title || '',
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal.link) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/links/${editModal.link.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: editModal.targetUrl.trim(),
          title: editModal.title.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditModal({ open: false, link: null, targetUrl: '', title: '' });
        fetchLinks();
      } else {
        alert(data.error || 'Erro ao atualizar link');
      }
    } catch {
      alert('Falha na requisição de atualização');
    } finally {
      setIsUpdating(false);
    }
  }

  function copyToClipboard(code: string) {
    const fullUrl = `${origin}/${code}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  }

  const filteredLinks = links.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.code.toLowerCase().includes(q) ||
      l.targetUrl.toLowerCase().includes(q) ||
      (l.title && l.title.toLowerCase().includes(q))
    );
  });

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Notification if 404 hit */}
        {notFoundSlug && (
          <div className="bg-rose-950/80 border border-rose-600/50 rounded-xl p-4 flex items-center justify-between text-rose-200 text-sm backdrop-blur animate-fade-in shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                O link encurtado <strong>/{notFoundSlug}</strong> não foi encontrado ou está temporariamente desativado.
              </span>
            </div>
            <button
              onClick={() => setNotFoundSlug(null)}
              className="text-rose-400 hover:text-white transition p-1 cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  ÁgilLink
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    Vercel Edge Ready
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Redirecionamento instantâneo com latência mínima e alta performance.
                </p>
              </div>
            </div>
          </div>

          {/* Storage & Guide Status Badge */}
          <div className="flex items-center flex-wrap gap-3">
            {storage?.type === 'redis' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Upstash Redis (Ativo na Vercel)</span>
              </div>
            ) : (
              <button
                onClick={() => setShowDeployGuide(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-950/70 text-xs font-medium transition cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Local / Arquivo</span>
                <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">
                  Como ativar Redis na Vercel?
                </span>
              </button>
            )}

            <button
              onClick={fetchLinks}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total de Links</p>
              <h3 className="text-2xl font-bold text-white mt-1">{links.length}</h3>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Link2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cliques Totais</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{totalClicks}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <MousePointerClick className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Velocidade de Redirecionamento</p>
              <h3 className="text-2xl font-bold text-cyan-300 mt-1">&lt; 15ms</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
              <CloudLightning className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Creation Box */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg md:text-xl font-bold text-white">Criar Novo Link Ultra-Rápido</h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Target URL */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  URL de Destino <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="https://exemplo.com.br/sua-pagina-final"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition"
                  required
                />
              </div>

              {/* Custom Slug */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Código / Slug (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">/</span>
                  <input
                    type="text"
                    placeholder="promocao"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(sanitizeSlug(e.target.value))}
                    className="w-full pl-6 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-cyan-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-mono transition"
                  />
                </div>
              </div>

              {/* Title / Tag */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Título / Identificador (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Campanha WhatsApp"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Error or Success Notice */}
            {formError && (
              <div className="text-xs text-rose-400 bg-rose-950/50 border border-rose-800/60 rounded-lg p-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{formSuccess}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Encurtando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Encurtar Link Agora</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Links List Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Seus Links Encurtados ({filteredLinks.length})
            </h2>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por slug, título ou URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {/* Cards / Table */}
          {loading ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Carregando links cadastrados...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <Link2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-300">Nenhum link encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                {search ? 'Nenhum resultado corresponde à sua busca.' : 'Crie seu primeiro link usando o formulário acima.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredLinks.map((link) => {
                const isCopied = copiedCode === link.code;

                return (
                  <div
                    key={link.code}
                    className={`p-4 md:p-5 rounded-2xl border transition-all ${
                      link.isActive
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base md:text-lg font-bold font-mono text-cyan-400 flex items-center gap-1.5">
                            /{link.code}
                          </span>

                          {link.title && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {link.title}
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              link.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {link.isActive ? 'Ativo' : 'Pausado'}
                          </span>
                        </div>

                        {/* Destination */}
                        <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate" title={link.targetUrl}>
                            {link.targetUrl}
                          </span>
                        </div>

                        {/* Timestamps */}
                        <div className="text-[11px] text-slate-500 flex items-center gap-4 pt-1">
                          <span>Criado em: {new Date(link.createdAt).toLocaleDateString('pt-BR')}</span>
                          {link.lastClickedAt && (
                            <span>
                              Último clique:{' '}
                              {new Date(link.lastClickedAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions & Clicks */}
                      <div className="flex items-center gap-3 shrink-0 flex-wrap justify-between md:justify-end">
                        {/* Click counter */}
                        <div className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center min-w-[70px]">
                          <span className="text-xs text-slate-400 block text-[10px] uppercase font-semibold">Cliques</span>
                          <span className="text-sm font-bold text-emerald-400">{link.clicks || 0}</span>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => copyToClipboard(link.code)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30'
                          }`}
                          title="Copiar link encurtado"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                        </button>

                        {/* Test button */}
                        <a
                          href={`/${link.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
                          title="Testar redirecionamento em nova aba"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* QR Code button */}
                        <button
                          onClick={() => handleOpenQr(link)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
                          title="Gerar e baixar QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => handleOpenEdit(link)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 cursor-pointer"
                          title="Editar link"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Toggle active button */}
                        <button
                          onClick={() => handleToggleActive(link)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition border cursor-pointer ${
                            link.isActive
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          }`}
                          title={link.isActive ? 'Pausar link' : 'Reativar link'}
                        >
                          {link.isActive ? 'Pausar' : 'Ativar'}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(link.code)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition border border-rose-500/30 cursor-pointer"
                          title="Excluir link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModal.open && qrModal.link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-sm w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setQrModal({ open: false, link: null, dataUrl: null })}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">QR Code do Link</h3>
              <p className="text-xs font-mono text-cyan-400">/{qrModal.link.code}</p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner">
              {loadingQr ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
                </div>
              ) : qrModal.dataUrl ? (
                <img
                  src={qrModal.dataUrl}
                  alt={`QR Code para ${qrModal.link.code}`}
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-500">
                  Erro ao gerar QR Code
                </div>
              )}
            </div>

            <div className="space-y-2">
              {qrModal.dataUrl && (
                <a
                  href={qrModal.dataUrl}
                  download={`qrcode-${qrModal.link.code}.png`}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  Baixar Imagem PNG
                </a>
              )}
              <button
                onClick={() => setQrModal({ open: false, link: null, dataUrl: null })}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Link Modal */}
      {editModal.open && editModal.link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setEditModal({ open: false, link: null, targetUrl: '', title: '' })}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Editar Link: /{editModal.link.code}
              </h3>
              <p className="text-xs text-slate-400">
                Altere a URL de destino ou o título. O slug /{editModal.link.code} permanece o mesmo.
              </p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Nova URL de Destino <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={editModal.targetUrl}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, targetUrl: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Título / Identificador
                </label>
                <input
                  type="text"
                  value={editModal.title}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, link: null, targetUrl: '', title: '' })}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vercel Upstash Deployment Guide Modal */}
      {showDeployGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setShowDeployGuide(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 w-fit mb-2">
                <CloudLightning className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Como Colocar no Ar 100% na Vercel</h3>
              <p className="text-xs text-slate-400">
                O projeto já está 100% pronto para a Vercel com suporte nativo ao Upstash Redis (Edge & Serverless).
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400">Passo 1: Subir na Vercel</span>
                <p className="text-slate-400">
                  Importe este repositório no seu painel da Vercel (<code className="text-slate-200">vercel.com/new</code>) ou use o comando <code className="text-slate-200">npx vercel</code> no terminal.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400">Passo 2: Conectar o Upstash Redis em 1 clique</span>
                <p className="text-slate-400">
                  No seu projeto na Vercel, vá em <strong>Storage</strong> → clique em <strong>Create Database</strong> → selecione <strong>Upstash Redis</strong> (gratuito) e clique em <strong>Connect</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400">Passo 3: Pronto!</span>
                <p className="text-slate-400">
                  A Vercel injeta as variáveis automaticamente (<code className="text-slate-200">KV_REST_API_URL</code> e <code className="text-slate-200">KV_REST_API_TOKEN</code>). Os redirecionamentos ocorrem na velocidade da luz diretamente na Edge Network.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDeployGuide(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-medium text-sm transition cursor-pointer"
            >
              Entendi, vamos em frente!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
