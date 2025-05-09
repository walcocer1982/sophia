import React, { useState } from 'react';
import { fetchDni } from '../services/api';
import { DniFormData, DniResult } from '../types';

const DniForm: React.FC = () => {
    const [dni, setDni] = useState<string>('');
    const [result, setResult] = useState<DniResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        try {
            const data: DniFormData = { numero: dni };
            const response = await fetchDni(data);
            setResult(response);
        } catch (err) {
            setError('Error fetching DNI information');
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="Enter DNI number"
                    required
                />
                <button type="submit">Submit</button>
            </form>
            {result && <div>{JSON.stringify(result)}</div>}
            {error && <div>{error}</div>}
        </div>
    );
};

export default DniForm;