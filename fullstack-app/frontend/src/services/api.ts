export const fetchDni = async (dniNumber: string): Promise<any> => {
    const response = await fetch(`http://localhost:5000/dni?numero=${dniNumber}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer apis-token-12599.Pn7NDHV3WJ2mpsY6TRzvJcXPKZHQw1Hw'
        }
    });

    if (!response.ok) {
        throw new Error('Error fetching DNI data');
    }

    return await response.json();
};