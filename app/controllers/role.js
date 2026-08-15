const responseMessages = require('../middlewares/response_messages');
const { errorHandlerFunction } = require('../middlewares/error');
const { findByNameCaseInsensitive, paginationFn } = require('../utils/common_utils');
const db = require('../models');

module.exports = {
  create: async (req, res) => {
    try {
      const checkExists = await findByNameCaseInsensitive(db.role, req.body.name.trim());
      if (checkExists) {
        return res.clientError({ msg: responseMessages[1024] });
      }

      const data = await db.role.create(req.body);
      if (data && data._id) {
        return res.success({
          msg: 'Role created!',
          result: data
        });
      }
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  get: async (req, res) => {
    try {
      const _id = req.params.id;
      const filterQuery = { isDeleted: false };

      if (_id) {
        filterQuery._id = _id;
        const data = await db.role.findOne(filterQuery);
        if (data) {
          return res.success({
            msg: responseMessages[1011],
            result: data
          });
        }
        return res.clientError({
          msg: responseMessages[1012]
        });
      }

      const { perPage, currentPage } = req.query;
      const { rows, pagination } = await paginationFn(
        res,
        db.role,
        filterQuery,
        perPage,
        currentPage,
        null,
        null,
        { isDeleted: 0 }
      );


      if (!rows.length) {
        return res.success({
          msg: responseMessages[1011],
          result: { rows }
        });
      }

      return res.success({
        msg: responseMessages[1012],
        result: { rows, pagination }
      });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  dropdown: async (req, res) => {
    try {
      const filterQuery = { isDeleted: false, status: 'active' };

      const data = await db.role.find(filterQuery, { name: 1 });

      if (!data.length) {
        return res.success({
          msg: responseMessages[1012],
          result: data
        });
      }

      return res.success({
        msg: responseMessages[1011],
        result: data.map((val) => { return { label: val.name, value: val._id.toString() } })
      });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  update: async (req, res) => {
    try {
      const _id = req.params.id
      const filterQuery = { _id, isDeleted: false };

      const checkExist = await db.role.findOne(filterQuery);
      if (!checkExist) {
        return res.clientError({ msg: responseMessages[1012] });
      }

      const checkUnique = await findByNameCaseInsensitive(db.role, (req.body.name).trim(), _id);

      if (checkUnique) {
        return res.clientError({
          msg: `Similar name already exists`
        });
      }

      const data = await db.role.updateOne(filterQuery, { $set: req.body });

      if (data?.modifiedCount) {
        return res.success({
          msg: responseMessages[1042],
          result: data
        });
      }
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  statusUpdate: async (req, res) => {
    try {
      const filterQuery = { isDeleted: false, _id: req.params.id };

      const checkExist = await db.role.findOne(filterQuery);
      if (!checkExist) {
        return res.clientError({ msg: responseMessages[1012] });
      }

      checkExist.status = checkExist.status === 'active' ? 'inactive' : 'active';
      await checkExist.save();

      return res.success({ msg: responseMessages[1016] });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  delete: async (req, res) => {
    try {
      const filterQuery = { isDeleted: false, _id: req.params.id };

      const checkExist = await db.role.findOne(filterQuery);
      if (!checkExist) {
        return res.clientError({ msg: responseMessages[1012] });
      }

      await db.role.updateOne(
        filterQuery, { $set: { isDeleted: true, deletedBy: req.decoded.user_id } }
      );

      return res.success({ msg: responseMessages[1043] });
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
}