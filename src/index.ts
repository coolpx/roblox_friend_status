// modules
import process from 'process';

// constants
const cookie = process.env.COOKIE;

if (!cookie) {
    console.error('Cookie not found in environment');
    process.exit()
}

// functions
function getXCSRFToken() {

}