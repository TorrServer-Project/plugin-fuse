# TorrServer FUSE

TorrServer plugin that mounts your torrent library as a local read-only
filesystem through FUSE.

## Features

- The whole library appears as an ordinary directory: the same layout as in
  the web interface, including categories and nested folders
- Read-only: files cannot be modified, uploaded, or deleted
- Files are streamed from the torrent engine on demand, so nothing is copied
  to local storage
- Mount point, autostart on server start, and access for other machine users
  are configured on the plugin page
- The owner's library is mounted; only the owner can control it

## Requirements

FUSE support is available on Linux, macOS, and FreeBSD. On other systems
(Windows, Android) the plugin page reports that mounting is not supported.

- **Linux:** the `fuse3` package (`fusermount3` or `fusermount`) and access to
  `/dev/fuse` for the server process
- **macOS:** [macFUSE](https://osxfuse.github.io/) installed
- **FreeBSD:** the `fusefs` kernel module and `/sbin/mount_fusefs`

### Docker

The container needs the FUSE device and the corresponding capability:

```yaml
devices:
  - /dev/fuse
cap_add:
  - SYS_ADMIN
```

## Installation

### From the plugin store

Open the admin panel → Plugins → Store → Install.

### Manual install

1. Download the latest release ZIP from [Releases](https://github.com/TorrServer-Project/plugin-fuse/releases).
2. In the admin panel go to Plugins → Manual install, upload the ZIP.
3. Enable the plugin if it is disabled.

## Usage

Open the plugin page from the sidebar menu or at `/plugins/fuse/`.

1. Create an empty directory on the machine, for example `/mnt/silo`.
   The library is mounted into it, so it must not contain other files.
2. Enter that path in the **Mount point** field.
3. Press **Mount**. The library is now available under that path.
4. Press **Unmount** before stopping the server or removing the directory.

Enable **Mount on server start** to mount automatically when the server
starts. Enable **Allow other users of this machine to read the mount** if the
mounted library must be readable by other accounts - this requires
`user_allow_other` in `/etc/fuse.conf` on Linux.

## Notes

- The library is **read-only**.
- The mount belongs to the server process. If the server is stopped without
  unmounting, the mount point may stay in a stale state; unmount it with
  `fusermount -u /mnt/silo` (Linux) or `umount /mnt/silo`.
- Unloading or disabling the plugin unmounts the filesystem automatically.

## Compatibility

- TorrServer (Silo version) or later
- FUSE protocol 7.8+

## License

See [LICENSE](LICENSE).
