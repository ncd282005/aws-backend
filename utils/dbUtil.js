const mongoose = require("mongoose");
const Company = require("../models/company.schema");

const getCompanyDatabase = async (companyId) => {
  // Fetch the company from the master database
  const company = await Company.findById(companyId);

  if (!company) {
    throw new Error("Company not found");
  }

  const dbName = company.db_name;
  const companyDb = mongoose.connection.useDb(dbName);

  return companyDb;
};

module.exports = { getCompanyDatabase };
