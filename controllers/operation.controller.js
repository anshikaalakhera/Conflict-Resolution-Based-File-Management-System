import {
    getAllOperations,
    getOperationById
} from '../services/operation.service.js';

import { executeFileOperation } from '../services/os.service.js';

export const getOperations = async (c) => {
    try {
        const operations = await getAllOperations();

        return c.json({
            message: 'Operations retrieved successfully',
            operations
        });

    } catch (error) {
        console.error('Error retrieving operations:', error);

        return c.json({
            message: 'Failed to retrieve operations',
            error: error.message
        }, 500);
    }
};

export const getOperation = async (c) => {
    try {
        const id = c.req.param('id');

        const operation = await getOperationById(id);

        if (!operation) {
            return c.json({
                message: 'Operation not found'
            }, 404);
        }

        return c.json({
            message: 'Operation retrieved successfully',
            operation
        });

    } catch (error) {
        console.error('Error retrieving operation:', error);

        return c.json({
            message: 'Failed to retrieve operation',
            error: error.message
        }, 500);
    }
};

export const executeOperation = async (c) => {
    try {
        const id = c.req.param('id');

        const operation = await getOperationById(id);

        if (!operation) {
            return c.json({
                message: 'Operation not found'
            }, 404);
        }

        const result = await executeFileOperation(operation);

        return c.json({
            message: 'Operation sent to OS layer',
            operation,
            result
        });

    } catch (error) {
        console.error('Error executing operation:', error);

        return c.json({
            message: 'Failed to execute operation',
            error: error.message
        }, 500);
    }
};
