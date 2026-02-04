const generate = require("../../generate");
const { domains } = require("../../../../config.json");

module.exports = async function getsecureinfo(settings, mcname = null) {
    // Use mcname as prefix if provided and not too long, otherwise generate a random prefix
    let prefix;
    
    // helper to generate 4 random digits (allows leading zeros)
    const rand4 = () => Math.floor(Math.random() * 10000).toString().padStart(4, "0");

    // If mcname exists, always use mcname plus .####; otherwise use soon.####
    if (mcname) {
        prefix = `${mcname}.${rand4()}`;
    } else {
        prefix = `soon.${rand4()}`;
    }
    
    const domain = settings?.domain || domains[0];
    const secEmail = `${prefix}@${domain}`;
    const password = generate(16);
    return { secEmail, password };
};
