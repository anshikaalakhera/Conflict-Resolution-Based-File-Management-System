import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const storageDirectory = path.join(process.cwd(), 'storage');

export const initializeStorage = async () => {
    await fs.mkdir(storageDirectory, { recursive: true });
};

export const saveFile = async (file) => {
    await initializeStorage();

    const fileId = crypto.randomUUID();
    const extension = path.extname(file.name);
    const storedFileName = `${fileId}${extension}`;
    const filePath = path.join(storageDirectory, storedFileName);

    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, buffer);

    return {
        id: fileId,
        originalName: file.name,
        storedName: storedFileName,
        path: filePath,
        size: buffer.length,
        type: file.type
    };
};