import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, StickerMetadata } from '../types';
import { loadProjects, saveProject, deleteProjectData } from '../services/db';
import { restoreProject } from '../services/backup';
import { Plus, Trash2, Upload, AtSign, ImageIcon, Sparkles, FolderOpen } from 'lucide-react';
import { AnimatedButton } from '../components/AnimatedComponents';

interface DashboardProps {
  onOpenProject: (project: Project) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [stickerCount, setStickerCount] = useState(8);
  const [isImporting, setIsImporting] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    fetchProjects();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProjects = async () => {
    const data = await loadProjects();
    setProjects(data.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const newProject = await restoreProject(file);
      if (newProject) {
        await fetchProjects();
        alert("專案匯入成功！");
      }
    } catch (err) {
      console.error(err);
      alert("匯入失敗，請確認檔案格式是否正確");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) onOpenProject(project);
  };

  const handleCreate = async () => {
    const title = tempTitle || newProjectName;
    if (!title) return;

    const stickers: StickerMetadata[] = [
      { id: 'main', index: -1, type: 'main', status: 'empty' },
      { id: 'tab', index: -1, type: 'tab', status: 'empty' },
      ...Array.from({ length: stickerCount }).map((_, i) => ({
        id: `sticker_${i}`,
        index: i,
        type: 'regular' as const,
        status: 'empty' as const,
      })),
    ];

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: title,
      width: 370,
      height: 320,
      totalStickers: stickerCount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stickers: stickers,
    };

    await saveProject(newProject);
    setProjects([newProject, ...projects]);
    setShowModal(false);
    setTempTitle('');
    onOpenProject(newProject);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('您確定要刪除此專案嗎？所有繪圖內容將會遺失。')) {
      await deleteProjectData(id);
      fetchProjects();
    }
  }

  const showCreateModal = showModal;
  const setShowCreateModal = setShowModal;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-50 via-white to-rose-50 overflow-x-hidden">
      {/* 隱藏的檔案輸入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip"
        className="hidden"
      />

      {/* 背景裝飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200/30 to-rose-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-amber-200/20 to-orange-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100/50 shadow-sm" style={{ paddingTop: 'var(--safe-area-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 p-0.5 shadow-lg shadow-orange-200/50">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
                <img src="logo.png" alt="Stix" className="w-8 h-8 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                Stix
              </h1>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">LINE 貼圖製作</p>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-2">
            <motion.a
              href="https://www.threads.com/@milu_got_lost"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all text-sm font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AtSign size={16} />
              <span>開發者</span>
            </motion.a>
            <motion.button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-sm font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Upload size={16} />
              <span>匯入</span>
            </motion.button>
            <motion.button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold text-sm shadow-lg shadow-orange-200/50 transition-all"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>新建專案</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* Mobile CTA Cards */}
        <motion.div
          className="sm:hidden space-y-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-base shadow-xl shadow-orange-200/40"
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles size={20} />
            開始創作新貼圖
          </motion.button>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={handleImport}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium text-sm shadow-sm"
              whileTap={{ scale: 0.97 }}
            >
              <FolderOpen size={18} />
              匯入專案
            </motion.button>
            <motion.a
              href="https://www.threads.com/@milu_got_lost"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium text-sm shadow-sm"
              whileTap={{ scale: 0.97 }}
            >
              <AtSign size={18} />
              聯絡開發者
            </motion.a>
          </div>
        </motion.div>

        {/* Section Header */}
        <motion.div
          className="flex items-center justify-between mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-bold text-slate-800">我的專案</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            {projects.length} 個
          </span>
        </motion.div>

        {/* Projects Grid or Empty State */}
        {projects.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-16 px-8 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-rose-100 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
              <ImageIcon size={36} className="text-orange-400" />
            </div>
            <p className="text-slate-500 text-center mb-1 font-medium">還沒有任何專案</p>
            <p className="text-slate-400 text-sm text-center mb-6">開始創作你的第一組 LINE 貼圖吧！</p>
            <motion.button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold shadow-lg shadow-orange-200/40"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={18} />
              建立專案
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                onClick={() => handleOpenProject(project.id)}
                className="group bg-white rounded-2xl p-4 cursor-pointer hover:shadow-xl transition-all duration-300 border border-slate-100 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.1)" }}
              >
                {/* Thumbnail Grid */}
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl mb-4 overflow-hidden relative border border-slate-100">
                  <div className="grid grid-cols-4 gap-1 p-3 w-full h-full">
                    {project.stickers.slice(0, 8).map((s, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.02]"
                      >
                        {s.thumbnail ? (
                          <img src={s.thumbnail} className="w-full h-full object-contain p-0.5" alt="" />
                        ) : (
                          <span className="text-[10px] text-slate-300 font-medium">
                            {s.type === 'main' ? '主' : s.type === 'tab' ? '標' : i + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="bg-white/95 text-slate-700 px-4 py-2 rounded-full font-semibold text-sm shadow-lg backdrop-blur-sm">
                      開啟專案
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-slate-800 text-base mb-1 truncate group-hover:text-orange-600 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {project.stickers.length} 張 • {new Date(project.updatedAt).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                  <motion.button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="shrink-0 text-slate-300 hover:text-red-500 p-2 bg-slate-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                    whileHover={{ scale: 1.1, backgroundColor: "#FEF2F2" }}
                    whileTap={{ scale: 0.9 }}
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-20 text-center">
          <p className="text-xs text-slate-300 font-medium">
            Stix v2.4.0
          </p>
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-rose-100 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                <Sparkles size={28} className="text-orange-500" />
              </div>

              <h2 className="text-xl font-bold text-center text-slate-800 mb-6">建立新專案</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">貼圖標題</label>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="例如：可愛小動物、日常生活..."
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-base"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <motion.button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold shadow-lg shadow-orange-200/40 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  開始創作
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};