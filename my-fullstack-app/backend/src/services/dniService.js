const axios = require('axios');

exports.fetchDniInfo = async (dniNumber) => {
  const response = await axios.get(`https://api.apis.net.pe/v2/reniec/dni?numero=${dniNumber}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Bearer apis-token-12599.Pn7NDHV3WJ2mpsY6TRzvJcXPKZHQw1Hw'
    }
  });
  return response.data;
};