# PYTHON

## Ubuntu

Ubuntu specific setup

Either

```
sudo apt-get install python-is-python3
```

Or edit .bashrc or .zshrc

```bash
alias python='python3'
```


## pyenv for version and environment management

Use pyenv for managing python versions

https://realpython.com/intro-to-pyenv - May need some required libraries.

### pyenv -- ubuntu deps

https://askubuntu.com/questions/1144446/python-installed-in-ubuntu-but-python-command-not-found

```bash
sudo apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev python3-openssl
```

### Installing pyenv

Installation

```
curl https://pyenv.run | bash
```

Setup .bashrc or .zshrc

```bash
# .bashrc or .zshrc

# Load pyenv automatically by appending
# the following to 
# ~/.bash_profile if it exists, otherwise ~/.profile (for login shells)
# and ~/.bashrc (for interactive shells) :

export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init - bash)"

# Restart your shell for the changes to take effect.

# Load pyenv-virtualenv automatically by adding
# the following to ~/.bashrc:

eval "$(pyenv virtualenv-init -)"
```

### Using pyenv

```bash
pyenv commands
pyenv install --list | grep " 3\.[678]"

# working with venv
pyenv virtualenv <python_version> <environment_name>
pyenv activate <environment_name>
pyenv deactivate
```
