import { Project, Layer } from '../types';
import { loadLayerImage, saveLayerImage, saveProject } from './db';

const BACKUP_VERSION = 1;

interface BackupMetadata {
    version: number;
    project: Project;
}

export const backupProject = async (project: Project) => {
    if (!window.JSZip || !window.saveAs) {
        alert("外部套件 JSZip 尚未載入，請稍後。");
        return;
    }

    const zip = new window.JSZip();

    // 1. Save Project Metadata
    const metadata: BackupMetadata = {
        version: BACKUP_VERSION,
        project: project
    };
    zip.file("project.json", JSON.stringify(metadata, null, 2));

    // 2. Save Layer Images
    const layersFolder = zip.folder("layers");

    // Need to save images for all stickers AND all layers
    // The current project.layers reflects the structure, but we need to iterate stickers to get the saved images
    // Note: If layers structure varies per sticker in the future, this logic needs update.
    // Currently, all stickers share the same layer structure defined in project.layers.

    const layersToSave = project.layers || [
        { id: 'l_draft', name: '草稿', visible: true, opacity: 0.5 },
        { id: 'l_color', name: '上色', visible: true, opacity: 1 },
        { id: 'l_line', name: '線稿', visible: true, opacity: 1 },
    ];

    let imageCount = 0;

    for (let i = 0; i < project.stickers.length; i++) {
        const stickerIndex = i; // This is the index used in DB keys

        for (const layer of layersToSave) {
            const key = `${project.id}_${stickerIndex}_${layer.id}`;
            const dataUrl = await loadLayerImage(key);

            if (dataUrl) {
                // Remove data:image/png;base64, prefix
                const base64Data = dataUrl.split(',')[1];
                if (base64Data) {
                    layersFolder.file(`${stickerIndex}_${layer.id}.png`, base64Data, { base64: true });
                    imageCount++;
                }
            }
        }
    }

    // 3. Generate Zip
    try {
        const content = await zip.generateAsync({ type: "blob" });
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        window.saveAs(content, `${project.name}_Backup_${dateStr}.zip`);
        console.log(`Backup completed. Saved ${imageCount} layer images.`);
    } catch (err) {
        console.error("Backup generation failed:", err);
        alert("備份失敗");
    }
};

export const restoreProject = async (file: File): Promise<Project | null> => {
    if (!window.JSZip) {
        alert("外部套件 JSZip 尚未載入。");
        return null;
    }

    try {
        const zip = await window.JSZip.loadAsync(file);

        // 1. Read Metadata
        const metaFile = zip.file("project.json");
        if (!metaFile) {
            throw new Error("Invalid backup: missing project.json");
        }

        const metaText = await metaFile.async("text");
        const metadata: BackupMetadata = JSON.parse(metaText);

        if (!metadata.project) throw new Error("Invalid backup: missing project data");

        // 2. Generate new ID to avoid conflict
        const oldId = metadata.project.id;
        const newId = crypto.randomUUID();
        const newProject: Project = {
            ...metadata.project,
            id: newId,
            name: `${metadata.project.name} (Imported)`,
            updatedAt: Date.now()
        };

        // 3. Restore Layer Images
        const layersFolder = zip.folder("layers");
        if (layersFolder) {
            const files = layersFolder.file(/.+\.png$/); // Regex match all pngs

            for (const file of files) {
                // Filename format: {stickerIndex}_{layerId}.png
                const fileName = file.name.replace("layers/", "");
                const [stickerIndexStr, ...layerIdParts] = fileName.replace(".png", "").split("_");
                const layerId = layerIdParts.join("_"); // Join back in case layerId has underscores

                // Construct new key: {newProjectId}_{stickerIndex}_{layerId}
                const newKey = `${newId}_${stickerIndexStr}_${layerId}`;

                const base64 = await file.async("base64");
                const dataUrl = `data:image/png;base64,${base64}`;

                await saveLayerImage(newKey, dataUrl);
            }
        }

        // 4. Save Project
        await saveProject(newProject);
        return newProject;

    } catch (err) {
        console.error("Restore failed:", err);
        alert(`匯入失敗: ${(err as Error).message}`);
        return null;
    }
};
