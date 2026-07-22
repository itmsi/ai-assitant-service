# 🔒 Git Security Fix - Menghapus API Key dari Repository

## ✅ Perbaikan yang Sudah Dilakukan

1. **Menghapus API Key dari file dokumentasi**:
   - `AI_ASSISTANT_SETUP.md` - API key diganti dengan placeholder
   - `AI_ASSISTANT_FIX.md` - API key diganti dengan placeholder

2. **Memastikan tidak ada API key di file lain**:
   - Semua file sudah di-scan
   - Tidak ada API key hardcoded di file yang akan di-commit

## 🚀 Langkah-langkah untuk Push ke GitHub

### Opsi 1: Commit Perubahan Baru (Recommended)

```bash
# 1. Stage file yang sudah diperbaiki
git add AI_ASSISTANT_SETUP.md AI_ASSISTANT_FIX.md

# 2. Commit perubahan
git commit -m "fix: remove API key from documentation files"

# 3. Push ke GitHub
git push origin main
```

**Catatan**: Commit sebelumnya yang mengandung API key masih ada di history. Jika GitHub masih memblokir, gunakan Opsi 2.

### Opsi 2: Update Commit History (Jika Opsi 1 Gagal)

Jika GitHub masih memblokir karena commit sebelumnya mengandung API key, perlu mengupdate commit history:

```bash
# 1. Check commit terakhir
git log --oneline -5

# 2. Update commit yang mengandung API key menggunakan git rebase
# Ganti commit hash dengan commit yang mengandung API key
git rebase -i HEAD~3

# Di editor, ubah 'pick' menjadi 'edit' untuk commit yang mengandung API key
# Setelah itu:
git add AI_ASSISTANT_SETUP.md AI_ASSISTANT_FIX.md
git commit --amend --no-edit
git rebase --continue

# 3. Force push (HATI-HATI: hanya jika Anda yakin)
git push origin main --force
```

**⚠️ Peringatan**: Force push akan mengubah history. Pastikan tidak ada orang lain yang sedang bekerja di branch yang sama.

### Opsi 3: Menggunakan GitHub Secret Scanning Unblock (Paling Aman)

Jika GitHub masih memblokir, Anda bisa menggunakan link yang diberikan GitHub:

1. Buka link yang diberikan GitHub di error message:
   ```
   https://github.com/itmsi/ai-assitant-service/security/secret-scanning/unblock-secret/353OGnzjP9bQMYyTfjLvxR9yCzU
   ```

2. Ikuti instruksi untuk unblock secret (ini akan memungkinkan push untuk secret yang sudah expired/diganti)

3. Setelah unblock, commit dan push perubahan:
   ```bash
   git add AI_ASSISTANT_SETUP.md AI_ASSISTANT_FIX.md
   git commit -m "fix: remove API key from documentation files"
   git push origin main
   ```

## 🔐 Best Practices untuk Masa Depan

1. **Jangan commit API key ke repository**:
   - Gunakan `.env` file yang sudah di-ignore di `.gitignore`
   - Gunakan placeholder di dokumentasi: `your-openai-api-key-here`

2. **Gunakan GitHub Secrets untuk CI/CD**:
   - Simpan API key di GitHub Secrets
   - Gunakan di GitHub Actions

3. **Scan repository secara berkala**:
   ```bash
   # Install gitleaks untuk scan
   brew install gitleaks  # macOS
   
   # Scan repository
   gitleaks detect --source . --verbose
   ```

4. **Jika API key terlanjur ter-commit**:
   - **SEGERA** rotate/revoke API key yang ter-expose
   - Hapus dari commit history
   - Update di semua environment

## 📝 Checklist

- [x] API key dihapus dari `AI_ASSISTANT_SETUP.md`
- [x] API key dihapus dari `AI_ASSISTANT_FIX.md`
- [x] Tidak ada API key di file lain
- [ ] Commit perubahan
- [ ] Push ke GitHub
- [ ] Rotate API key jika sudah ter-expose (jika perlu)

## 🆘 Jika Masih Ada Masalah

1. **Check apakah masih ada API key di commit history**:
   ```bash
   git log -p --all -S "sk-proj-" | grep "sk-proj-"
   ```

2. **Jika masih ada, gunakan BFG Repo-Cleaner**:
   ```bash
   # Install BFG
   brew install bfg  # macOS
   
   # Clone repository fresh
   git clone --mirror https://github.com/itmsi/ai-assitant-service.git
   
   # Remove API key
   bfg --replace-text passwords.txt
   
   # Update repository
   cd ai-assitant-service.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push
   ```

3. **Atau gunakan git filter-branch**:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch AI_ASSISTANT_SETUP.md" \
   --prune-empty --tag-name-filter cat -- --all
   ```

## ✅ Status

- ✅ File sudah diperbaiki
- ⏳ Menunggu commit dan push
- ⏳ Menunggu unblock dari GitHub (jika diperlukan)

