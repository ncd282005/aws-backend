module.exports = {
  apps: [{
    name: "aws-backend",
    script: "app.js",
    instances: "max",
    exec_mode: "cluster"
  }]
}
