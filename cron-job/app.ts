import axios, { type AxiosResponse } from 'axios';

interface User {
    id: number;
    name: string;
    email: string;
}

async function getUser(id: number): Promise<User> {
    try {
        const response: AxiosResponse<User> = await axios.get(
            `https://alguna-api.com/users/${id}`
        );
        return response.data;
    } catch (error: any) {
        throw new Error(`Error en petición: ${error.message}`);
    }
}

async function createUser(user: Omit<User, 'id'>): Promise<User> {
    try {
        const response: AxiosResponse<User> = await axios.post(
            'https://alguna-api./users',
            user,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(`Error en petición: ${error.message}`);
    }
}

(async () => {
    const user = await getUser(1);
    console.log('Usuario encontrado:', user);

    const newUser = await createUser({
        name: 'Carlos',
        email: 'carlos@test.com',
    });
    console.log('Usuario creado:', newUser);
})();