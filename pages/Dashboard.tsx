import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, StickerMetadata } from '../types';
import { loadProjects, saveProject, deleteProjectData } from '../services/db';
import { restoreProject } from '../services/backup';
import { Plus, Trash2, Upload, AtSign, Download, ImageIcon } from 'lucide-react';
import { AnimatedButton, AnimatedCard } from '../components/AnimatedComponents';

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

  // 手機版檢測
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
    // 優先使用 tempTitle (新 Modal 邏輯) 或 fallback to newProjectName (舊邏輯兼容)
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
    setShowModal(false); // 關閉舊 Modal
    setTempTitle(''); // 清空
    onOpenProject(newProject);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('您確定要刪除此專案嗎？所有繪圖內容將會遺失。')) {
      await deleteProjectData(id);
      fetchProjects();
    }
  }

  // 為了兼容原本的 setShowModal 邏輯，這裡定義一個 setShowCreateModal 其實就是 setShowModal
  // 但為了對應改寫後的 UI 命名，我們使用 showCreateModal 變數名
  const showCreateModal = showModal;
  const setShowCreateModal = setShowModal;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 隱藏的檔案輸入框 (功能保留) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip"
        className="hidden"
      />

      {/* Top Navigation Bar - Fixed & Solid */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" alt="Stix" className="w-full h-full object-contain p-1" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF9A56] bg-clip-text text-transparent leading-none">
              Stix
            </h1>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <motion.a
              href="https://www.threads.com/@milu_got_lost"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-medium text-sm hover:bg-slate-200 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AtSign size={16} />
              <span>聯絡開發者</span>
            </motion.a>
            <div className="h-6 w-px bg-slate-300 mx-1"></div>
            <AnimatedButton onClick={handleImport} variant="secondary" className="px-5">
              <Upload size={18} className="mr-2" />
              匯入
            </AnimatedButton>
            <AnimatedButton onClick={() => setShowCreateModal(true)} variant="primary" className="px-5 shadow-md shadow-indigo-200">
              <Plus size={18} className="mr-2" />
              新建專案
            </AnimatedButton>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-8 pt-24 pb-20">
        {/* Mobile Action Bar (Visible only on mobile) */}
        <div className="sm:hidden mb-8 grid grid-cols-2 gap-3">
          <AnimatedButton onClick={() => setShowCreateModal(true)} variant="primary" className="col-span-2 py-3 shadow-md shadow-indigo-100">
            <Plus size={18} className="mr-2" />
            新建貼圖專案
          </AnimatedButton>
          <AnimatedButton onClick={handleImport} variant="secondary" className="py-2.5 bg-white border-slate-200">
            <Upload size={18} className="mr-2" />
            匯入專案
          </AnimatedButton>
          <motion.a
            href="https://www.threads.com/@milu_got_lost"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium text-sm"
            whileTap={{ scale: 0.97 }}
          >
            <AtSign size={16} />
            聯絡開發者
          </motion.a>
        </div>

        {/* Projects Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-700">我的專案</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{projects.length} 個專案</span>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 gap-4 mt-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <ImageIcon size={32} className="opacity-50" />
            </div>
            <p>還沒有貼圖專案，開始創作吧！</p>
            <AnimatedButton
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="mt-2"
            >
              <Plus size={18} className="mr-2" />
              立即新增
            </AnimatedButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                layoutId={project.id}
                onClick={() => handleOpenProject(project.id)}
                className="bg-white rounded-2xl p-4 cursor-pointer hover:shadow-xl transition-all border border-slate-100 group relative overflow-hidden"
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="aspect-[4/3] bg-slate-50 rounded-xl mb-4 overflow-hidden relative border border-slate-100 flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-1 p-4 w-full h-full opacity-60 scale-90 group-hover:scale-100 transition-transform duration-500">
                    {project.stickers.slice(0, 8).map((s, i) => (
                      <div key={i} className="aspect-square bg-white rounded-md shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center">
                        {s.thumbnail ? (
                          <img src={s.thumbnail} className="w-full h-full object-contain p-0.5" alt="" />
                        ) : (
                          <span className="text-[10px] text-slate-300">
                            {s.type === 'main' ? '主' : s.type === 'tab' ? '標' : i + 1}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 text-slate-700 px-4 py-2 rounded-full font-bold text-sm shadow-sm backdrop-blur-sm">
                      開啟專案
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{project.name}</h3>
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                      {project.stickers.length} 張貼圖 • {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="text-slate-300 hover:text-red-500 p-2 shrink-0 bg-slate-50 rounded-full"
                      whileHover={{ scale: 1.1, backgroundColor: "#FEF2F2", color: "#EF4444" }}
                      whileTap={{ scale: 0.9 }}
                      title="刪除"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer Version Info */}
        <div className="mt-16 text-center text-xs text-slate-300 font-mono pb-8">
          STIX v2.3.1 (Fixed Layout)
        </div>
      </main>

      {/* Modal - 響應式 + 動畫 */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-xl font-bold mb-4 text-slate-800">建立新專案</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">標題</label>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="請輸入貼圖標題..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-base"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <AnimatedButton
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  取消
                </AnimatedButton>
                <AnimatedButton
                  onClick={handleCreate}
                  variant="primary"
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 font-medium shadow-md"
                >
                  建立
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};