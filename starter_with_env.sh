#!/bin/bash

export EXT_PORT=80
export PORT=8000
export CAPTCHA_SITEVERIFY_URI=https://www.google.com/recaptcha/api/siteverify

#dev
export SECRET_KEYV3=6LdfU0MaAAAAADAihxmGE3oa5KD1p2_vEr1M-pEi
export HTML_CODE=6LdfU0MaAAAAALKh9DO0VF25a5kWCOBfCi0d0ngX

echo "Environment variables set"
node deviceid-recaptcha.js
