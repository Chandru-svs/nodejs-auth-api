const moment = require('moment');
const crypto = require('node:crypto');
const { errorHandlerFunction } = require('../middlewares/error');

module.exports = {
  paginationFn: async (
    res,
    model,
    findQuery,
    perPage = 10,
    currentPage = 0,
    populateValues = null,
    sort = null,
    select = null
  ) => {
    try {
      const numOfLessons = await model.find(findQuery).countDocuments();

      const data = await model
        .find(findQuery)
        .populate(populateValues)
        .limit(perPage)
        .skip(perPage * currentPage)
        .sort(sort)
        .select(select);

      return {
        rows: data,
        pagination: {
          currentPage,
          pages: Math.ceil(numOfLessons / (perPage || 10)),
          total: numOfLessons,
        },
      };
    } catch (error) {
      errorHandlerFunction(res, error);
    }
  },
  calculatePercentage: (total, score) => {
    // console.log('total', total, score)
    const percentage = ((score / total) * 100).toFixed();
    if (isNaN(percentage)) return 0;
    if (percentage > 100) return 100;
    return parseInt(percentage);
  },
  getDateFilterQuery: (dateFilter, dateField = 'createdAt') => {
    let startDate, endDate;

    console.log('dateFilter----------', dateFilter)
    switch (dateFilter) {
      case 'today':
        startDate = moment().startOf('day').toDate();
        endDate = moment().endOf('day').toDate();
        break;

      case 'yesterday':
        startDate = moment().subtract(1, 'day').startOf('day').toDate();
        endDate = moment().subtract(1, 'day').endOf('day').toDate();
        break;

      case 'last7days':
        startDate = moment().subtract(7, 'day').startOf('day').toDate();
        endDate = moment().endOf('day').toDate();
        break;

      case 'thisweek':
        startDate = moment().startOf('week').toDate();
        endDate = moment().endOf('week').toDate();
        break;

      case 'lastweek':
        startDate = moment().subtract(1, 'week').startOf('week').toDate();
        endDate = moment().subtract(1, 'week').endOf('week').toDate();
        break;

      case 'thismonth':
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
        break;

      case 'lastmonth':
        startDate = moment().subtract(1, 'month').startOf('month').toDate();
        endDate = moment().subtract(1, 'month').endOf('month').toDate();
        break;

      default:
        if (dateFilter && typeof dateFilter === 'object' && dateFilter.from && dateFilter.to) {
          startDate = moment(dateFilter.from, 'YYYY-MM-DD').startOf("day").toDate();
          endDate = moment(dateFilter.to, 'YYYY-MM-DD').endOf("day").toDate();
        } else {
          return {};
        }
    }

    return {
      [dateField]: { $gte: startDate, $lte: endDate }
    };
  },
  findByNameCaseInsensitive: async (model, name, excludeId = null) => {
    const filter = { isDeleted: false, name };
    if (excludeId) filter._id = { $ne: excludeId };
    return model.findOne(filter).collation({ locale: 'en', strength: 2 });
  },
  generateOTP: (length = 6) => {
    const min = 10 ** (length - 1);
    const max = 10 ** length;

    return crypto.randomInt(min, max).toString();
  },
  requestMeta: (req) => {
    return {
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress || req?.ip,
      userAgent: req.headers['user-agent'] || '',
    }
  }
};
