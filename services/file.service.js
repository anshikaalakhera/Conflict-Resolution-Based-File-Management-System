import pool from '../config/db.js';

export const getAllFiles = async () => {
    const [rows] = await pool.query('SELECT 1 AS database_test');

    return rows;
};

export const getFileById = async (id) => {
    return {
        id,
        message: 'Database query will be added after DBMS schema is finalized'
    };
};

export const createNewFile = async (data) => {
    return {
        data,
        message: 'Database insert will be added after DBMS schema is finalized'
    };
};

export const updateExistingFile = async (id, data) => {
    return {
        id,
        data,
        message: 'Database update will be added after DBMS schema is finalized'
    };
};

export const deleteFileById = async (id) => {
    return {
        id,
        message: 'Database delete will be added after DBMS schema is finalized'
    };
};