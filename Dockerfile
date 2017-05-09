FROM firstandthird/node:6.10-3-onbuild

ENTRYPOINT ["dumb-init", "node", "bin.js"]
CMD []
