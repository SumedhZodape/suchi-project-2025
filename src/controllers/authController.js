// import SystemUser from '../models/SystemUser.js';
import { SystemUser, Role,Prant} from '../models/index.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

// Register a new user
export const register = async (req, res) => {
  try {
    const { password, role_id, prant_id, sanghatan_id } = req.body;
    const role = await Role.findById(role_id);
    if (!role) {
      return res.status(400).json({ message: 'Invalid role_id.' });
    }
   
    if(role.name === 'admin'){
        if(!password || !role_id) {
          return res.status(400).json({ message: 'Password and role_id are required.' });
        }
        const existingUser = await SystemUser.find({password, role_id});
        if(existingUser.length > 0) {
          return res.status(400).json({ message: 'User with this password and role_id already exists.' });
        }
        const newUser = new SystemUser({ password, role_id });
        await newUser.save();
        return res.status(201).json({ message: 'Admin user registered successfully.' });
    }

    if(role.name === 'vividhkshetra') {
      if(!password || !sanghatan_id) {
        return res.status(400).json({ message: 'prant_id and sanghatan_id are required.' });
      }
        const existingUser = await SystemUser.find({password, role_id, sanghatan_id});
        if(existingUser.length > 0) {
          return res.status(400).json({ message: 'User with this password, role_id and sanghatan_id already exists.' });
        }
        const newUser = new SystemUser({ password, role_id, sanghatan_id });
        await newUser.save();
        return res.status(201).json({ message: 'Vividhkshetra user registered successfully.' });
    }

    if(role.name === 'user') {

      if(!password || !prant_id) {
        return res.status(400).json({ message: 'prant_id is required.' });
      }
        const existingUser = await SystemUser.find({password, role_id, prant_id});
        if(existingUser.length > 0) {
          return res.status(400).json({ message: 'User with this password, role_id and prant_id already exists.' });
        }
        const newUser = new SystemUser({ password, role_id, prant_id });
        await newUser.save();
        console.log(newUser)
        return res.status(201).json({ message: 'User registered successfully.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
};

// Login user
export const login = async (req, res) => {
    try {
        const { password, role_id, prant_id, sanghatan_id } = req.body;
        if (!password || !role_id) {
            return res.status(400).json({ message: 'Password and role_id are required.' });
        }

        // Find role to determine required fields
        const role = await Role.findById(role_id);
        if (!role) {
            return res.status(400).json({ message: 'Invalid role_id.' });
        }

        let query = { role_id };

        if (role.name === 'admin') {
            // Only password and role_id needed
        } else if (role.name === 'vividhkshetra') {
            if (!sanghatan_id) {
                return res.status(400).json({ message: 'sanghatan_id is required.' });
            }
            query.sanghatan_id = sanghatan_id;
        } else if (role.name === 'user') {
            if (!prant_id) {
                return res.status(400).json({ message: 'prant_id is required.' });
            }
            const prantname = await Prant.findById(prant_id).select('name').exec();
            query.prant_id = prantname;
            // console.log(query.prant_id)  // Uncomment to print the prant's name for debugging purposes  // Note: This is a placeholder and will not work with the current schema
           
        }

        const user = await SystemUser.findOne(query);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Simple password check (no bcrypt)
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role_id: user.role_id },
            config.jwtSecret,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: { id: user._id, role_id: user.role_id }
        });
    } catch (err) {
        res.status(500).json({ message: 'Login failed.', error: err.message });
    }
};
