# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"

  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    echo "Updating and installing zip, unzip"
    sudo apt-get update -qq
    sudo apt-get install -qq zip

    echo "Downloading node"
    curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

    echo "Installing nodejs"
    sudo apt-get install -qq nodejs

    echo "Downloading pip"
    curl -sO https://bootstrap.pypa.io/get-pip.py
    echo "Installing pip"
    python3 get-pip.py --user --no-warn-script-location

    echo "Setting path to use aws"
    sed -i '$a export PATH=~/.local/bin:$PATH' /home/vagrant/.bashrc

    # Also export PATH now so we can install awscli
    export PATH=~/.local/bin:$PATH

    echo "Installing awscli"
    pip3 install awscli --user

    rm get-pip.py
  SHELL
end
