import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, StickerMetadata } from '../types';
import { loadProjects, saveProject, deleteProjectData } from '../services/db';
import { restoreProject } from '../services/backup';
import { Plus, Trash2, Upload, AtSign } from 'lucide-react';
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

  const handleImportClick = () => {
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
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!newProjectName) return;

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
      name: newProjectName,
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
    onOpenProject(newProject);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('您確定要刪除此專案嗎？所有繪圖內容將會遺失。')) {
      await deleteProjectData(id);
      fetchProjects();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header - 響應式 */}
        <header className={`mb-8 sm:mb-10 ${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Stix" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-sm bg-white" />
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-tight">
                <span className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9A56] bg-clip-text text-transparent">Stix</span>
              </h1>
              <p className="text-slate-500 text-sm font-medium">輕鬆製作 LINE 貼圖</p>
            </div>
          </div>
          <div className={`flex gap-3 ${isMobile ? 'flex-col sm:flex-row' : 'items-center'}`}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".zip"
              className="hidden"
            />
            <motion.a
              href="https://www.threads.com/@milu_got_lost"
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center gap-2 font-bold text-sm ${isMobile ? 'w-full justify-center p-3' : 'p-3'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="追蹤我 (Threads)"
            >
              <AtSign size={18} />
              <span>聯絡開發者</span>
            </motion.a>
            <AnimatedButton
              onClick={handleImportClick}
              disabled={isImporting}
              variant="secondary"
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              <Upload size={18} />
              {isImporting ? "匯入中..." : "匯入專案"}
            </AnimatedButton>
            <AnimatedButton
              onClick={() => setShowModal(true)}
              variant="primary"
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              <Plus size={18} />
              新建專案
            </AnimatedButton>
          </div>
        </header>

        {/* 專案列表 - 響應式 */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 sm:py-20 bg-white rounded-2xl border border-dashed border-slate-300"
          >
            <p className="text-slate-400 text-base sm:text-lg">目前沒有專案。立即建立一個吧！</p>
          </motion.div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="bg-white rounded-xl shadow-sm hover:shadow-xl border border-slate-200 cursor-pointer overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="h-32 sm:h-40 bg-slate-100 flex items-center justify-center relative">
                  <div className="grid grid-cols-4 gap-1 p-4 opacity-50">
                    {project.stickers.filter(s => s.type === 'regular').slice(0, 8).map((s, i) => (
                      <div key={i} className="w-6 sm:w-8 h-6 sm:h-8 bg-white rounded-sm border border-slate-200 overflow-hidden">
                        {s.thumbnail && <img src={s.thumbnail} alt="" className="w-full h-full object-contain" />}
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base sm:text-lg text-slate-800 truncate">{project.name}</h3>
                      <p className="text-xs sm:text-sm text-slate-500">{project.totalStickers} 張貼圖 • {new Date(project.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <motion.button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="text-slate-300 hover:text-red-500 p-2 shrink-0"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - 響應式 + 動畫 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className={`bg-white w-full sm:max-w-md shadow-2xl text-left ${isMobile ? 'rounded-t-2xl p-6' : 'rounded-2xl p-8'}`}
              initial={{ opacity: 0, y: isMobile ? 100 : 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isMobile ? 100 : 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-slate-800">建立新專案</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">專案名稱</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-green-500 outline-none text-base"
                    placeholder="例如：我的原創貼圖"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">貼圖數量</label>
                  <select
                    value={stickerCount}
                    onChange={(e) => setStickerCount(Number(e.target.value))}
                    className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg p-3 text-base"
                  >
                    {[8, 16, 24, 32, 40].map((num) => (
                      <option key={num} value={num}>
                        {num} 張貼圖
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6 sm:mt-8">
                <AnimatedButton
                  onClick={() => setShowModal(false)}
                  variant="ghost"
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