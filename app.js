// Sistema de Verificação de Documentos - RH
// Aplicação SPA 100% offline com LocalStorage

class DocumentVerificationSystem {
    constructor() {
        this.candidates = [];
        this.currentEditId = null;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        
        this.initializeEventListeners();
        this.loadTheme();
        this.loadData();
        this.render();
    }

    // ==================== INICIALIZAÇÃO ====================
    
    initializeEventListeners() {
        // Navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });

        // Formulário
        document.getElementById('candidate-form').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancel-form').addEventListener('click', () => this.resetForm());
        
        // Adiciona evento de tecla Enter para salvar
        document.getElementById('candidate-form').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleFormSubmit(e);
            }
        });
        
        document.getElementById('has-children').addEventListener('change', () => this.toggleChildrenDocsField());
        document.getElementById('children-count').addEventListener('change', () => this.generateChildrenDocumentsFields());
        
        // Busca
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('clear-search').addEventListener('click', () => this.clearSearch());
        
        // Gestão de Dados
        document.getElementById('backup-data').addEventListener('click', () => this.backupData());
        document.getElementById('restore-data').addEventListener('click', () => this.triggerFileInput());
        document.getElementById('restore-file').addEventListener('change', (e) => this.restoreData(e.target.files[0]));
        document.getElementById('export-csv').addEventListener('click', () => this.exportCSV());
        document.getElementById('reset-data').addEventListener('click', () => this.resetData());
        
        // Comunicação
        document.getElementById('print-pending').addEventListener('click', () => this.showPrintModal());
        document.getElementById('close-print-modal').addEventListener('click', () => this.hidePrintModal());
        document.getElementById('cancel-print-modal').addEventListener('click', () => this.hidePrintModal());
        document.getElementById('confirm-print-modal').addEventListener('click', () => this.executePrint());
        document.getElementById('copy-message').addEventListener('click', () => this.copyMessage());
        document.getElementById('whatsapp-message').addEventListener('click', () => this.shareWhatsApp());
        document.getElementById('email-message').addEventListener('click', () => this.shareEmail());
        
        // Tema
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    }

    // ==================== GESTÃO DE DADOS ====================
    
    loadData() {
        const savedData = localStorage.getItem('rh_candidates');
        if (savedData) {
            try {
                this.candidates = JSON.parse(savedData);
            } catch (e) {
                console.error('Erro ao carregar dados:', e);
                this.candidates = [];
            }
        } else {
            // Sistema começa zerado, sem dados de exemplo
            this.candidates = [];
        }
    }

    saveData() {
        localStorage.setItem('rh_candidates', JSON.stringify(this.candidates));
        this.showToast('Dados salvos com sucesso!', 'success');
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // ==================== LÓGICA DE NEGÓCIO ====================
    
    calculateStatus(candidate) {
        const requiredDocs = this.getRequiredDocuments(candidate);
        const deliveredDocs = candidate.documents.length;
        const totalRequired = requiredDocs.length;
        
        const percentage = totalRequired > 0 ? Math.round((deliveredDocs / totalRequired) * 100) : 0;
        
        return {
            percentage,
            isComplete: percentage === 100,
            delivered: deliveredDocs,
            total: totalRequired,
            missing: requiredDocs.filter(doc => !candidate.documents.includes(doc))
        };
    }

    getRequiredDocuments(candidate) {
        let docs = [
            'Entrevista Online',
            'Curriculo',
            'RG',
            'CTPS Digital',
            'Comprovante de Situacao Cadastral CPF',
            'Certidao de Nascimento ou Casamento',
            'Historico Escolar',
            'Comprovante de Residencia',
            'Carteira de Vacina',
            'Cartao do SUS',
            'PIS ou NIS ou NIT',
            'Extrato Bancario',
            'Quitacao Eleitoral'
        ];

        // Certificado de Alistamento é obrigatório apenas para homens
        if (candidate.gender === 'Masculino') {
            docs.push('Certificado de Alistamento');
        }

        // Documentos condicionais - documentos específicos por filho
        if (candidate.hasChildren && candidate.childrenCount) {
            for (let i = 1; i <= candidate.childrenCount; i++) {
                docs.push(`CPF do Filho ${i}`);
                docs.push(`Certidão de Nascimento do Filho ${i}`);
                docs.push(`Cartão de Vacina do Filho ${i}`);
            }
        }

        return docs;
    }

    // ==================== INTERFACES ====================
    
    render() {
        this.updateStats();
        this.renderCandidatesTable();
        this.renderPendingList();
        this.renderMessagePreview();
    }

    updateStats() {
        const total = this.candidates.length;
        const completed = this.candidates.filter(c => this.calculateStatus(c).isComplete).length;
        
        document.getElementById('total-candidates').textContent = total;
        document.getElementById('completed-candidates').textContent = completed;
    }

    renderCandidatesTable(searchTerm = '') {
        const tbody = document.getElementById('candidates-table');
        const noResults = document.getElementById('no-results');
        let filteredCandidates = this.candidates;

        if (searchTerm) {
            filteredCandidates = this.candidates.filter(candidate => 
                candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filteredCandidates.length === 0) {
            tbody.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        tbody.innerHTML = filteredCandidates.map(candidate => {
            const status = this.calculateStatus(candidate);
            const statusClass = status.isComplete ? 'status-complete' : 'status-incomplete';
            const statusText = status.isComplete ? 'COMPLETO' : 'INCOMPLETO';
            
            return `
                <tr>
                    <td>
                        <div>
                            <strong>${candidate.name}</strong>
                        </div>
                    </td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${status.percentage}%"></div>
                            </div>
                            <span class="progress-text">${status.delivered}/${status.total}</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            <i class="fas fa-${status.isComplete ? 'check' : 'exclamation-triangle'}"></i>
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="app.editCandidate('${candidate.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="app.copyMissingDocs('${candidate.id}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="app.deleteCandidate('${candidate.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderPendingList() {
        const container = document.getElementById('pending-list');
        const incompleteCandidates = this.candidates.filter(c => !this.calculateStatus(c).isComplete);
        
        if (incompleteCandidates.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Todos os candidatos estão com a documentação completa!</p>';
            return;
        }

        container.innerHTML = incompleteCandidates.map(candidate => {
            const status = this.calculateStatus(candidate);
            return `
                <div class="pending-item">
                    <div>
                        <span class="candidate-name">${candidate.name}</span>
                    </div>
                    <div class="missing-docs">
                        Faltam: ${status.missing.join(', ')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderMessagePreview() {
        const container = document.getElementById('message-preview');
        const incompleteCandidates = this.candidates.filter(c => !this.calculateStatus(c).isComplete);
        
        if (incompleteCandidates.length === 0) {
            container.textContent = 'Todos os candidatos estão com a documentação completa!';
            return;
        }

        const message = this.generateMessage(incompleteCandidates);
        container.textContent = message;
    }

    generateMessage(candidates) {
        const date = new Date().toLocaleDateString('pt-BR');
        let message = `📋 *RELATÓRIO DE PENDÊNCIAS - ${date}*\n\n`;
        
        candidates.forEach((candidate, index) => {
            const status = this.calculateStatus(candidate);
            message += `${index + 1}. *${candidate.name}*\n`;
            message += `   Documentos faltantes: ${status.missing.join(', ')}\n`;
            message += `\n`;
        });

        message += `Por favor, providencie a documentação pendente para regularização dos processos.\n\n`;
        message += `Atenciosamente,\nDepartamento de RH`;

        return message;
    }

    // ==================== FORMULÁRIO ====================
    
    switchSection(sectionName) {
        // Atualiza navegação
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.nav-btn[data-section="${sectionName}"]`).classList.add('active');
        
        // Mostra/esconde seções
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Se for para o formulário, limpa ou carrega dados
        if (sectionName === 'form') {
            if (this.currentEditId) {
                this.loadFormForEdit(this.currentEditId);
            } else {
                this.resetForm();
            }
        }
    }

    loadFormForEdit(id) {
        const candidate = this.candidates.find(c => c.id === id);
        if (!candidate) return;

        document.getElementById('form-title').textContent = 'Editar Cadastro';
        document.getElementById('candidate-id').value = candidate.id;
        document.getElementById('name').value = candidate.name;
        document.getElementById('gender').value = candidate.gender;
        document.getElementById('has-children').checked = candidate.hasChildren;

        // Marca documentos
        document.querySelectorAll('input[name="documents"]').forEach(checkbox => {
            checkbox.checked = candidate.documents.includes(checkbox.value);
        });

        // Atualiza campos condicionais
        this.toggleChildrenDocsField();
        
        // Carrega quantidade de filhos se tiver
        const childrenCount = candidate.childrenCount || 0;
        if (candidate.hasChildren && childrenCount > 0) {
            document.getElementById('children-count').value = childrenCount;
            this.generateChildrenDocumentsFields();
            
            // Marca documentos de cada filho após os campos serem gerados
            setTimeout(() => {
                for (let i = 1; i <= childrenCount; i++) {
                    document.querySelectorAll(`input[name="child-${i}-documents"]`).forEach(checkbox => {
                        checkbox.checked = candidate.documents.includes(checkbox.value);
                    });
                }
            }, 100);
        }
        
        // Se tem filhos mas não tem childrenCount (dado antigo), assume 1 filho
        if (candidate.hasChildren && !candidate.childrenCount) {
            document.getElementById('children-count').value = 1;
            this.generateChildrenDocumentsFields();
            
            // Tenta marcar os documentos antigos se existirem
            setTimeout(() => {
                // Para dados antigos, tenta marcar "CPF dos Filhos", "Certidao...", "Cartao..."
                const oldDocNames = ['CPF dos Filhos', 'Certidao de Nascimento dos Filhos', 'Cartao de Vacina dos Filhos'];
                oldDocNames.forEach(docName => {
                    const checkbox = document.querySelector(`input[name="child-1-documents"][value="${docName}"]`);
                    if (checkbox) {
                        checkbox.checked = candidate.documents.includes(docName);
                    }
                });
            }, 100);
        }
    }

    resetForm() {
        document.getElementById('form-title').textContent = 'Novo Cadastro';
        document.getElementById('candidate-form').reset();
        document.getElementById('candidate-id').value = '';
        document.getElementById('children-docs-field').style.display = 'none';
        document.getElementById('children-count-field').style.display = 'none';
        document.getElementById('children-documents-field').style.display = 'none';
        document.getElementById('children-documents-container').innerHTML = '';
        document.getElementById('children-count').value = '0';
        document.querySelectorAll('input[name="documents"]').forEach(cb => cb.checked = false);
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const hasChildren = document.getElementById('has-children').checked;
        const childrenCount = parseInt(document.getElementById('children-count').value) || 0;
        
        const candidateData = {
            name: formData.get('name'),
            gender: formData.get('gender'),
            hasChildren: hasChildren,
            childrenCount: childrenCount,
            documents: [],
            createdAt: new Date().toISOString()
        };

        // Coleta documentos selecionados do candidato
        document.querySelectorAll('input[name="documents"]:checked').forEach(cb => {
            candidateData.documents.push(cb.value);
        });

        // Coleta documentos de cada filho
        if (hasChildren && childrenCount > 0) {
            for (let i = 1; i <= childrenCount; i++) {
                document.querySelectorAll(`input[name="child-${i}-documents"]:checked`).forEach(cb => {
                    candidateData.documents.push(cb.value);
                });
            }
        }

        // Validação
        if (!this.validateForm(candidateData)) return;

        if (this.currentEditId) {
            this.updateCandidate(this.currentEditId, candidateData);
        } else {
            this.addCandidate(candidateData);
        }

        this.switchSection('dashboard');
        this.render();
    }

    validateForm(data) {
        // Limpa mensagens de erro anteriores
        this.clearValidationErrors();
        
        let isValid = true;
        let errorMessage = '';

        // Validação de campos obrigatórios
        if (!data.name || data.name.trim() === '') {
            this.showValidationError('name', 'Nome é obrigatório');
            errorMessage = 'Por favor, preencha o nome do candidato!';
            isValid = false;
        }

        if (!data.gender || data.gender === '') {
            this.showValidationError('gender', 'Gênero é obrigatório');
            if (!errorMessage) errorMessage = 'Por favor, selecione o gênero do candidato!';
            isValid = false;
        }

        // Remove destaque de erro se todos os documentos estiverem presentes
        const checkboxGrid = document.querySelector('.checkbox-grid');
        if (checkboxGrid) {
            checkboxGrid.style.borderColor = 'var(--border-color)';
            checkboxGrid.style.backgroundColor = 'var(--bg-color)';
        }

        if (!isValid) {
            this.showToast(errorMessage, 'error');
            return false;
        }

        return true;
    }

    showValidationError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const formGroup = field.closest('.form-group');
        
        // Adiciona classe de erro
        formGroup.classList.add('error');
        
        // Cria mensagem de erro se não existir
        let errorElement = formGroup.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            errorElement.style.color = 'var(--danger-color)';
            errorElement.style.fontSize = 'var(--font-size-xs)';
            errorElement.style.marginTop = 'var(--spacing-xs)';
            formGroup.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
    }

    clearValidationErrors() {
        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
        });
        
        document.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
    }

    addCandidate(data) {
        const newCandidate = {
            ...data,
            id: this.generateId()
        };
        
        this.candidates.push(newCandidate);
        this.saveData();
        this.showToast('✅ Candidato cadastrado com sucesso!', 'success');
        
        // Reseta o formulário após o cadastro bem-sucedido
        this.resetForm();
        this.currentEditId = null;
        document.getElementById('form-title').textContent = 'Novo Cadastro';
    }

    updateCandidate(id, data) {
        const index = this.candidates.findIndex(c => c.id === id);
        if (index !== -1) {
            this.candidates[index] = { ...this.candidates[index], ...data };
            this.saveData();
            this.showToast('Candidato atualizado com sucesso!', 'success');
            
            // Atualiza a interface imediatamente após a edição
            this.render();
        }
    }

    deleteCandidate(id) {
        if (confirm('Tem certeza que deseja excluir este candidato?')) {
            this.candidates = this.candidates.filter(c => c.id !== id);
            this.saveData();
            this.render();
            this.showToast('Candidato excluído com sucesso!', 'success');
        }
    }

    editCandidate(id) {
        this.currentEditId = id;
        this.switchSection('form');
    }

    // ==================== CAMPOS CONDICIONAIS ====================
    

    toggleChildrenDocsField() {
        const hasChildren = document.getElementById('has-children').checked;
        const countField = document.getElementById('children-count-field');
        const documentsField = document.getElementById('children-documents-field');
        const oldChildrenField = document.getElementById('children-docs-field');
        
        if (hasChildren) {
            countField.style.display = 'block';
            oldChildrenField.style.display = 'none';
        } else {
            countField.style.display = 'none';
            documentsField.style.display = 'none';
            oldChildrenField.style.display = 'none';
            // Limpa os documentos dos filhos
            document.getElementById('children-count').value = '0';
            document.getElementById('children-documents-container').innerHTML = '';
        }
    }

    generateChildrenDocumentsFields() {
        const count = parseInt(document.getElementById('children-count').value);
        const container = document.getElementById('children-documents-container');
        const documentsField = document.getElementById('children-documents-field');
        
        if (count > 0) {
            documentsField.style.display = 'block';
            container.innerHTML = '';
            
            for (let i = 1; i <= count; i++) {
                const childHtml = `
                    <div class="child-documents-section">
                        <h4 style="margin-bottom: 10px; color: var(--primary-color);">
                            <i class="fas fa-child"></i> Filho ${i}
                        </h4>
                        <div class="checkbox-grid">
                            <label><input type="checkbox" name="child-${i}-documents" value="CPF do Filho ${i}"> CPF do Filho ${i}</label>
                            <label><input type="checkbox" name="child-${i}-documents" value="Certidão de Nascimento do Filho ${i}"> Certidão de Nascimento do Filho ${i}</label>
                            <label><input type="checkbox" name="child-${i}-documents" value="Cartão de Vacina do Filho ${i}"> Cartão de Vacina do Filho ${i}</label>
                        </div>
                    </div>
                `;
                container.innerHTML += childHtml;
            }
        } else {
            documentsField.style.display = 'none';
            container.innerHTML = '';
        }
    }

    // ==================== BUSCA ====================
    
    handleSearch(term) {
        this.renderCandidatesTable(term);
    }

    clearSearch() {
        document.getElementById('search-input').value = '';
        this.renderCandidatesTable();
    }

    // ==================== GESTÃO DE DADOS ====================
    
    backupData() {
        const dataStr = JSON.stringify(this.candidates, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const filename = `backup_rh_${new Date().toISOString().slice(0, 10)}.json`;
        
        saveAs(blob, filename);
        this.showToast('Backup realizado com sucesso!', 'success');
    }

    triggerFileInput() {
        document.getElementById('restore-file').click();
    }

    restoreData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    this.candidates = data;
                    this.saveData();
                    this.render();
                    this.showToast('Dados restaurados com sucesso!', 'success');
                } else {
                    throw new Error('Formato de arquivo inválido');
                }
            } catch (error) {
                this.showToast('Erro ao restaurar dados: Arquivo inválido', 'error');
            }
        };
        reader.readAsText(file);
    }

    exportCSV() {
        const headers = ['Nome', 'Gênero', 'Tem Filhos', 'Quantidade de Filhos', 'Documentos Entregues', 'Documentos Exigidos', 'Status', 'Documentos Faltantes'];
        
        const csvData = this.candidates.map(candidate => {
            const status = this.calculateStatus(candidate);
            const missingDocs = status.missing.length > 0 ? status.missing.join('; ') : 'Nenhum';
            return [
                candidate.name,
                candidate.gender,
                candidate.hasChildren ? 'Sim' : 'Não',
                candidate.childrenCount || 0,
                status.delivered,
                status.total,
                status.isComplete ? 'COMPLETO' : 'INCOMPLETO',
                missingDocs
            ];
        });

        const csv = Papa.unparse({
            fields: headers,
            data: csvData
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const filename = `relatorio_rh_${new Date().toISOString().slice(0, 10)}.csv`;
        
        saveAs(blob, filename);
        this.showToast('Relatório CSV exportado com sucesso!', 'success');
    }

    resetData() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita!')) {
            localStorage.removeItem('rh_candidates');
            this.candidates = [];
            this.saveData();
            this.render();
            this.showToast('Todos os dados foram resetados!', 'info');
        }
    }

    // ==================== COMUNICAÇÃO ====================
    
    showPrintModal() {
        const incompleteCandidates = this.candidates.filter(c => !this.calculateStatus(c).isComplete);
        const modalBody = document.getElementById('print-modal-body');
        
        modalBody.innerHTML = `
            <div class="print-header">
                <h1>Lista de Pendências de Documentos</h1>
                <div class="print-date">Departamento de RH - ${new Date().toLocaleDateString('pt-BR')}</div>
            </div>
            
            <div class="print-summary">
                <div class="total">Total de candidatos com pendências: <strong>${incompleteCandidates.length}</strong></div>
            </div>
            
            ${incompleteCandidates.length === 0 ? 
                '<div class="print-no-pending">✅ Todos os candidatos estão com a documentação completa!</div>' : 
                incompleteCandidates.map((candidate, index) => {
                    const status = this.calculateStatus(candidate);
                    return `
                        <div class="print-candidate">
                            <div class="print-candidate-name">${index + 1}. ${candidate.name}</div>
                            <div class="print-missing-docs">
                                <strong>Documentos Faltantes:</strong><br>
                                ${status.missing.join('<br>')}
                            </div>
                        </div>
                    `;
                }).join('')
            }
            
            <div class="print-footer">
                Sistema de Verificação de Documentos - RH
            </div>
        `;
        
        document.getElementById('print-modal').style.display = 'flex';
    }
    
    hidePrintModal() {
        document.getElementById('print-modal').style.display = 'none';
    }
    
    executePrint() {
        // Cria um iframe oculto para impressão
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        printFrame.style.position = 'absolute';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);
        
        const frameDoc = printFrame.contentWindow.document;
        const incompleteCandidates = this.candidates.filter(c => !this.calculateStatus(c).isComplete);
        
        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Lista de Pendências - RH</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #10b981;
                        padding-bottom: 15px;
                        margin-bottom: 15px;
                    }
                    .header h1 {
                        color: #10b981;
                        margin: 0;
                        font-size: 20px;
                    }
                    .date {
                        color: #666;
                        font-size: 12px;
                        margin-top: 5px;
                    }
                    .summary {
                        background: #f3f4f6;
                        padding: 12px;
                        border-radius: 6px;
                        margin-bottom: 15px;
                        text-align: center;
                        font-size: 14px;
                    }
                    .candidate {
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        padding: 12px;
                        margin-bottom: 12px;
                        page-break-inside: avoid;
                    }
                    .candidate-name {
                        font-size: 14px;
                        font-weight: bold;
                        color: #10b981;
                        margin-bottom: 8px;
                    }
                    .missing-docs {
                        color: #ef4444;
                        font-size: 12px;
                        line-height: 1.5;
                    }
                    .missing-docs strong {
                        color: #333;
                    }
                    .no-pending {
                        text-align: center;
                        padding: 30px;
                        color: #10b981;
                        font-size: 14px;
                    }
                    .footer {
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 1px solid #e5e7eb;
                        text-align: center;
                        font-size: 10px;
                        color: #999;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Lista de Pendências de Documentos</h1>
                    <div class="date">Departamento de RH - ${new Date().toLocaleDateString('pt-BR')}</div>
                </div>
                
                <div class="summary">
                    <strong>Total de candidatos com pendências:</strong> ${incompleteCandidates.length}
                </div>
                
                ${incompleteCandidates.length === 0 ? 
                    '<div class="no-pending">Todos os candidatos estão com a documentação completa!</div>' : 
                    incompleteCandidates.map((candidate, index) => {
                        const status = this.calculateStatus(candidate);
                        return `
                            <div class="candidate">
                                <div class="candidate-name">${index + 1}. ${candidate.name}</div>
                                <div class="missing-docs">
                                    <strong>Documentos Faltantes:</strong><br>
                                    ${status.missing.join('<br>')}
                                </div>
                            </div>
                        `;
                    }).join('')
                }
                
                <div class="footer">
                    Sistema de Verificação de Documentos - RH
                </div>
            </body>
            </html>
        `);
        frameDoc.close();
        
        // Espera carregar e imprime
        printFrame.onload = function() {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        };
        
        // Remove o iframe após impressão
        setTimeout(() => {
            document.body.removeChild(printFrame);
        }, 1000);
        
        this.hidePrintModal();
    }

    copyMessage() {
        const message = document.getElementById('message-preview').textContent;
        navigator.clipboard.writeText(message).then(() => {
            this.showToast('Mensagem copiada para a área de transferência!', 'success');
        }).catch(err => {
            this.showToast('Erro ao copiar mensagem', 'error');
        });
    }

    copyMissingDocs(id) {
        const candidate = this.candidates.find(c => c.id === id);
        if (!candidate) return;

        const status = this.calculateStatus(candidate);
        let message = `Está faltando os seguintes documentos:\n\n`;

        if (status.missing.length > 0) {
            status.missing.forEach((doc, index) => {
                message += `• ${doc}\n`;
            });
        } else {
            message += `• Nenhum documento faltando!`;
        }

        navigator.clipboard.writeText(message).then(() => {
            this.showToast('✅ Mensagem copiada para a área de transferência!', 'success');
        }).catch(err => {
            this.showToast('Erro ao copiar mensagem', 'error');
        });
    }

    shareWhatsApp() {
        const message = encodeURIComponent(document.getElementById('message-preview').textContent);
        const url = `https://wa.me/?text=${message}`;
        window.open(url, '_blank');
    }

    shareEmail() {
        const subject = encodeURIComponent('Relatório de Pendências - Departamento de RH');
        const body = encodeURIComponent(document.getElementById('message-preview').textContent);
        const url = `mailto:?subject=${subject}&body=${body}`;
        window.open(url);
    }

    // ==================== TEMA ====================
    
    loadTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.getElementById('theme-text').textContent = this.currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.loadTheme();
    }

    // ==================== UTILITÁRIOS ====================
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Inicializa a aplicação
const app = new DocumentVerificationSystem();

