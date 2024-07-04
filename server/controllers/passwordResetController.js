import { PasswordResetService } from "../service/passwordResetService.js";


export default class PasswordResetController {



    async passwordUpdate(req, res, next) {
        try {
            const passwordResetService = new PasswordResetService();
            const result = await passwordResetService.passwordUpdate();
            return res.json({ data: result, status: 200 });
        }
        catch (ex) {
            const err = {}
            err.statusCode = 500;
            err.message = ex.message;
            next(err)
        }
    }

    

    async passwordReset(req, res, next) {
        try {
            const passwordResetService = new PasswordResetService();
            console.log(req.body.phone)
            const result = await passwordResetService.passwordReset(req.body.phone);
            return res.json({ data: result, status: 200 });
        }
        catch (ex) {
            const err = {}
            err.statusCode = 500;
            err.message = ex.message;
            next(err)
        }
    }














}