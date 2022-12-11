import Veterinario from "../models/Veterinario.js";
import generarJWT from "../helpers/generarJWT.js";
import generarId from "../helpers/generarId.js";
import emailRegistro from "../helpers/emailRegistro.js";
import emailOlvodePassword from "../helpers/emailOlvidePassword.js";

const registrar = async (req, res) => {
    const { email, nombre } = req.body;
    //Prevenir usuarios duplicados 
    const existeUsuario = await Veterinario.findOne({ email });
    //console.log(existeUsuario)

    if (existeUsuario){
        const error = new Error('Usuario ya registrado');
        return res.status(400).json({msg: error.message});
    }
    
    try {
        //Guardar un nuevo veterinario
        const veterinario = new Veterinario(req.body);
        const veterinarioGuardado = await veterinario.save();

        //Enviar email
        emailRegistro({
            email,
            nombre,
            token: veterinarioGuardado.token
        });

        res.json(veterinarioGuardado);
    } catch (error) {
        console.log(error);
    }

};

const confirmar = async (req,res) =>{
    const {token} = req.params;

    const usuarioConfirmar = await Veterinario.findOne({token});
    

    if(!usuarioConfirmar || usuarioConfirmar.confirmado){
        const error = new Error('Token no válido');
        return res.status(404).json({msg: error.message});
    }
    
    try {
        usuarioConfirmar.token = null;
        usuarioConfirmar.confirmado = true;

        await usuarioConfirmar.save();

        res.json({ msg: 'Usuario confirmado', token });    
    } catch (error) {
        console.log(error)
    }
    
}

const autenticar = async (req, res) => {
    // console.log(req.body);
    const { email, password } = req.body;

    const usuario = await Veterinario.findOne({ email });

    //Comprobar si el usuario existe
    if (!usuario){
        const error = new Error('El usuario no existe');
        return res.status(403).json({msg: error.message});
    }

    //Comprobar si el usuario está confirmado
    if(!usuario.confirmado){
        const error = new Error('El usuario no está confirmado');
        return res.status(403).json({msg: error.message});
    }

    //Revisar el password
    if( await usuario.comprobarPassword(password) ){
        //autenticar
        res.json({ 
            _id: usuario._id,
            nombre: usuario.nombre,
            email: usuario.email,
            token: generarJWT(usuario.id) 
        });
    }else{
        const error = new Error('El password es incorrecto');
        return res.status(403).json({msg: error.message});
    }

    
}

const perfil = (req, res) => {

    const {veterinario} = req;

    res.json({veterinario});
};

const olvidePassword = async (req, res) => {
    const {email} = req.body;

    const existeVeterinario = await Veterinario.findOne({email});
    if(!existeVeterinario || !existeVeterinario.confirmado){
        const error = new Error('El usuario no existe o no ha sido confirmado');
        return res.status(400).json({msg: error.message});
    }

    try {
        existeVeterinario.token = generarId();
        await existeVeterinario.save();

        emailOlvodePassword({
            email,
            nombre: existeVeterinario.nombre,
            token: existeVeterinario.token
        })

        res.json({msg: 'Hemos enviado un email con las instrucciones'});
    } catch (error) {
        console.log(error);
    }
};

const comprobarToken = async (req, res) => {
    const { token } = req.params;
    const tokenValido = await Veterinario.findOne({token});

    if(tokenValido && tokenValido.confirmado){
        res.json({msg: 'Token válido', tokenValido});
    }else{
        const error = new Error('Token no válido');
        return res.status(400).json({msg: error.message});
    }
};

const nuevoPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body

    const veterinario = await Veterinario.findOne({token});


    if(!veterinario || !veterinario.confirmado){
        const error = new Error('Token no válido');
        return res.status(400).json({msg: error.message});
    }

    try {
        veterinario.token = null;
        veterinario.password = password;
        await veterinario.save();
        res.json({msg: 'Contraseña cambiada correctamente'});
    } catch (error) {
        console.log(error)
    }
};

const actualizarPerfil = async(req,res) => {
    const {id} = req.params;
    const datos = req.body;

    const veterinario = await Veterinario.findById(id);

    if(!veterinario || !veterinario.confirmado){
        const error = new Error('Usuario no válido');
        return res.status(400).json({msg: error.message});
    }

    if(veterinario.email !== datos.email){
        const email = datos.email;
        const emailExiste = await Veterinario.findOne({email});
        if(emailExiste){
            const error = new Error('El email no es válido, ya está registrado');
            return res.status(400).json({msg: error.message});
        }
    }

    try {
        veterinario.nombre = datos.nombre;
        veterinario.email = datos.email;
        veterinario.telefono = datos.telefono;
        veterinario.web = datos.web;

        await veterinario.save();
        res.json({msg: 'Usuario actualizado correctamente'});
    } catch (error) {
        const e = new Error('Usuario no válido');
        return res.status(400).json({msg: e.message});
    }

}

const actualizarPassword = async (req,res) => {
    const {id} = req.veterinario;
    const {passwordNuevo,passwordActual} = req.body

    const veterinario = await Veterinario.findById(id);
    if( await veterinario.comprobarPassword(passwordActual) ){
        veterinario.password = passwordNuevo;
        await veterinario.save();
        res.json({msg: 'Contraseña cambiada correctamente'});
    }else{
        const error = new Error('La contraseña actual está errada');
        return res.status(400).json({msg: error.message});
    }
    
}

export {
    registrar,
    perfil, 
    confirmar,
    autenticar,
    olvidePassword,
    comprobarToken,
    nuevoPassword,
    actualizarPerfil,
    actualizarPassword
};