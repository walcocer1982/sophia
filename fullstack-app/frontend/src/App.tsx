import React, { useState } from 'react';
import DniForm from './components';

const App: React.FC = () => {
    const [dniData, setDniData] = useState(null);
    const [error, setError] = useState('');

    const handleDniSubmit = async (dniNumber: string) => {
        try {
            const response = await fetch(`http://localhost:5000/dni?numero=${dniNumber}`);
            if (!response.ok) {
                throw new Error('Error fetching DNI data');
            }
            const data = await response.json();
            setDniData(data);
            setError('');
        } catch (err) {
            setError(err.message);
            setDniData(null);
        }
    };

    return (
        <div>
            <h1>DNI Information</h1>
            <DniForm onSubmit={handleDniSubmit} />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {dniData && <pre>{JSON.stringify(dniData, null, 2)}</pre>}
        </div>
    );
};

export default App;