import { Router } from 'express';
import { DniController } from '../controllers';

const router = Router();
const dniController = new DniController();

export function setRoutes(app: any) {
    app.use('/dni', router);
    router.get('/:numero', dniController.getDni.bind(dniController));
}