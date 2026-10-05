import pool from '../config/db.js';

export const getAllOperations = async () => {
    const [rows] = await pool.query(`
        SELECT *
        FROM OPERATIONS
        ORDER BY operation_id DESC
    `);

    return rows;
};

export const getOperationById = async (id) => {
    const [rows] = await pool.query(
        `
        SELECT *
        FROM OPERATIONS
        WHERE operation_id = ?
        `,
        [id]
    );

    return rows[0] || null;
};