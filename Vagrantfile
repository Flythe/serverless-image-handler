# -*- mode: ruby -*-
# vi: set ft=ruby :

require 'yaml'

settings = YAML.load_file 'vagrant.yml'

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"

  config.vm.network :forwarded_port, guest: 8080, host: 8080
  config.vm.synced_folder ".", "/vagrant"

  config.vm.provision "shell", :args => [settings['aws_region'],settings['aws_access_key'],settings['aws_secret_key']], privileged: false, inline: <<-SHELL
    echo "Updating"
    sudo apt-get update -qq

    if ! zip --version; then
        echo "Installing zip, unzip"
        sudo apt-get install -qq zip
    fi

    if ! nodejs --version; then
        echo "Downloading node"
        curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -

        echo "Installing nodejs"
        sudo apt-get install -qq nodejs
    fi

    # Also export PATH now so we can install awscli
    export PATH=~/.local/bin:$PATH

    if ! pip3 --version; then
        echo "Downloading pip"
        curl -sO https://bootstrap.pypa.io/get-pip.py
        echo "Installing pip"
        python3 get-pip.py --user --no-warn-script-location

        echo "Setting path to use aws"
        sed -i '$a export PATH=~/.local/bin:$PATH' /home/vagrant/.bashrc

        rm get-pip.py
    fi

    if ! aws --version; then
        echo "Installing awscli"
        pip3 install awscli --user

        mkdir ~/.aws
        touch ~/.aws/credentials
        printf '[default]\naws_secret_access_key = $1\naws_access_key_id = $2' > ~/.aws/credentials
        touch ~/.aws/config
        printf '[default]\nregion = $3'
    fi
  SHELL
end
