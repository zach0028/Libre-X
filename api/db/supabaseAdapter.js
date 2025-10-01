/**
 * Supabase Database Adapter
 *
 * Provides MongoDB-like interface for Supabase queries
 * Facilitates migration by maintaining similar API signatures
 */

const { supabase, handleSupabaseError, executeQuery } = require('./supabase');
const { logger } = require('@librechat/data-schemas');

/**
 * Base Adapter Class
 * Provides common methods for all tables
 */
class SupabaseAdapter {
  constructor(tableName) {
    this.tableName = tableName;
    this.client = supabase;
  }

  /**
   * Find one document by ID
   * MongoDB: Model.findById(id)
   */
  async findById(id, select = '*') {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(select)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found (expected)
        throw error;
      }

      return data;
    } catch (err) {
      logger.error(`[${this.tableName}] findById error:`, err);
      throw err;
    }
  }

  /**
   * Find one document by criteria
   * MongoDB: Model.findOne({ ... })
   */
  async findOne(criteria = {}, select = '*') {
    try {
      let query = this.client.from(this.tableName).select(select);

      // Apply criteria
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (err) {
      logger.error(`[${this.tableName}] findOne error:`, err);
      throw err;
    }
  }

  /**
   * Find multiple documents
   * MongoDB: Model.find({ ... })
   */
  async find(criteria = {}, options = {}) {
    try {
      const { select = '*', limit, offset, orderBy } = options;

      let query = this.client.from(this.tableName).select(select);

      // Apply criteria
      Object.entries(criteria).forEach(([key, value]) => {
        if (value && typeof value === 'object' && '$in' in value) {
          // Handle $in operator
          query = query.in(key, value.$in);
        } else if (value && typeof value === 'object' && '$ne' in value) {
          // Handle $ne operator
          query = query.neq(key, value.$ne);
        } else {
          query = query.eq(key, value);
        }
      });

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      // Apply offset
      if (offset) {
        query = query.range(offset, offset + (limit || 100) - 1);
      }

      // Apply ordering
      if (orderBy) {
        const [column, direction] = orderBy.split(':');
        query = query.order(column, { ascending: direction !== 'desc' });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (err) {
      logger.error(`[${this.tableName}] find error:`, err);
      throw err;
    }
  }

  /**
   * Create new document
   * MongoDB: Model.create({ ... })
   */
  async create(data) {
    try {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return result;
    } catch (err) {
      logger.error(`[${this.tableName}] create error:`, err);
      throw err;
    }
  }

  /**
   * Update document by ID
   * MongoDB: Model.findByIdAndUpdate(id, { ... })
   */
  async findByIdAndUpdate(id, updates, options = {}) {
    try {
      const { returnNew = true } = options;

      const { data, error } = await this.client
        .from(this.tableName)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) {
        throw error;
      }

      return returnNew ? data?.[0] : { ok: 1 };
    } catch (err) {
      logger.error(`[${this.tableName}] findByIdAndUpdate error:`, err);
      throw err;
    }
  }

  /**
   * Update multiple documents
   * MongoDB: Model.updateMany({ criteria }, { updates })
   */
  async updateMany(criteria, updates) {
    try {
      let query = this.client.from(this.tableName).update({
        ...updates,
        updated_at: new Date().toISOString(),
      });

      // Apply criteria
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.select();

      if (error) {
        throw error;
      }

      return { modifiedCount: data?.length || 0 };
    } catch (err) {
      logger.error(`[${this.tableName}] updateMany error:`, err);
      throw err;
    }
  }

  /**
   * Delete document by ID
   * MongoDB: Model.findByIdAndDelete(id)
   */
  async findByIdAndDelete(id) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (err) {
      logger.error(`[${this.tableName}] findByIdAndDelete error:`, err);
      throw err;
    }
  }

  /**
   * Delete multiple documents
   * MongoDB: Model.deleteMany({ ... })
   */
  async deleteMany(criteria) {
    try {
      let query = this.client.from(this.tableName).delete();

      // Apply criteria
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.select();

      if (error) {
        throw error;
      }

      return { deletedCount: data?.length || 0 };
    } catch (err) {
      logger.error(`[${this.tableName}] deleteMany error:`, err);
      throw err;
    }
  }

  /**
   * Count documents
   * MongoDB: Model.countDocuments({ ... })
   */
  async countDocuments(criteria = {}) {
    try {
      let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

      // Apply criteria
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (err) {
      logger.error(`[${this.tableName}] countDocuments error:`, err);
      throw err;
    }
  }

  /**
   * Upsert (insert or update)
   * MongoDB: Model.findOneAndUpdate({ ... }, { ... }, { upsert: true })
   */
  async upsert(criteria, updates) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .upsert({
          ...criteria,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      logger.error(`[${this.tableName}] upsert error:`, err);
      throw err;
    }
  }

  /**
   * Cursor-based pagination
   * MongoDB: Model.find().limit().skip()
   */
  async paginate(criteria = {}, { limit = 25, cursor = null, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    try {
      let query = this.client.from(this.tableName).select('*');

      // Apply criteria
      Object.entries(criteria).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply cursor pagination
      if (cursor) {
        const operator = sortOrder === 'desc' ? 'lt' : 'gt';
        query = query[operator](sortBy, cursor);
      }

      // Apply sorting and limit
      query = query.order(sortBy, { ascending: sortOrder !== 'desc' }).limit(limit + 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Check if there's a next page
      const hasNextPage = data.length > limit;
      const items = hasNextPage ? data.slice(0, -1) : data;
      const nextCursor = hasNextPage ? items[items.length - 1][sortBy] : null;

      return {
        items,
        nextCursor,
        hasNextPage,
      };
    } catch (err) {
      logger.error(`[${this.tableName}] paginate error:`, err);
      throw err;
    }
  }
}

/**
 * Create adapters for each table
 */
const ProfilesAdapter = new SupabaseAdapter('profiles');
const ComparisonSessionsAdapter = new SupabaseAdapter('comparison_sessions');
const ScoringTemplatesAdapter = new SupabaseAdapter('scoring_templates');
const ModelBenchmarksAdapter = new SupabaseAdapter('model_benchmarks');
const FilesAdapter = new SupabaseAdapter('files');
const TransactionsAdapter = new SupabaseAdapter('transactions');
const RolesAdapter = new SupabaseAdapter('roles');
const GroupsAdapter = new SupabaseAdapter('groups');

module.exports = {
  SupabaseAdapter,
  ProfilesAdapter,
  ComparisonSessionsAdapter,
  ScoringTemplatesAdapter,
  ModelBenchmarksAdapter,
  FilesAdapter,
  TransactionsAdapter,
  RolesAdapter,
  GroupsAdapter,
};
