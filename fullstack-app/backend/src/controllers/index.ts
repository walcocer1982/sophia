class DniController {
    async getDni(req, res) {
        const dniNumber = req.query.numero;
        const token = 'apis-token-12599.Pn7NDHV3WJ2mpsY6TRzvJcXPKZHQw1Hw';

        try {
            const response = await axios.get(`https://api.apis.net.pe/v2/reniec/dni?numero=${dniNumber}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            res.json(response.data);
        } catch (error) {
            res.status(error.response ? error.response.status : 500).json({
                message: error.message,
                error: error.response ? error.response.data : null
            });
        }
    }
}

export default DniController;