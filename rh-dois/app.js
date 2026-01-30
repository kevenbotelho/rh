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
        document.getElementById('print-pending').addEventListener('click', () => this.printPendingList());
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
            // Dados de exemplo para demonstração
            this.candidates = this.generateSampleData();
        }
    }

    saveData() {
        localStorage.setItem('rh_candidates', JSON.stringify(this.candidates));
        this.showToast('Dados salvos com sucesso!', 'success');
    }

    generateSampleData() {
        return [
            {
                id: this.generateId(),
                name: 'João Silva',
                gender: 'Masculino',
                hasChildren: false,
                documents: ['Entrevista Online', 'Curriculo', 'RG', 'CTPS Digital', 'Comprovante de Situacao Cadastral CPF', 'Certidao de Nascimento ou Casamento', 'Historico Escolar', 'Comprovante de Residencia', 'Certificado de Alistamento', 'Carteira de Vacina', 'Cartao do SUS', 'PIS ou NIS ou NIT', 'Extrato Bancario', 'Quitacao Eleitoral'],
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: 'Maria Santos',
                gender: 'Feminino',
                hasChildren: true,
                documents: ['Entrevista Online', 'Curriculo', 'RG', 'CTPS Digital', 'Comprovante de Situacao Cadastral CPF', 'Certidao de Nascimento ou Casamento', 'Historico Escolar', 'Comprovante de Residencia', 'Carteira de Vacina', 'Cartao do SUS', 'PIS ou NIS ou NIT', 'Extrato Bancario', 'Quitacao Eleitoral', 'CPF dos Filhos', 'Certidao de Nascimento dos Filhos', 'Cartao de Vacina dos Filhos'],
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: 'Carlos Oliveira',
                gender: 'Masculino',
                hasChildren: false,
                documents: ['Entrevista Online', 'Curriculo'],
                createdAt: new Date().toISOString()
            }
        ];
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

        // Documentos condicionais
        if (candidate.hasChildren) {
            docs.push('CPF dos Filhos');
            docs.push('Certidao de Nascimento dos Filhos');
            docs.push('Cartao de Vacina dos Filhos');
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
    }

    resetForm() {
        document.getElementById('form-title').textContent = 'Novo Cadastro';
        document.getElementById('candidate-form').reset();
        document.getElementById('candidate-id').value = '';
        document.getElementById('children-docs-field').style.display = 'none';
        document.querySelectorAll('input[name="documents"]').forEach(cb => cb.checked = false);
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const candidateData = {
            name: formData.get('name'),
            gender: formData.get('gender'),
            hasChildren: document.getElementById('has-children').checked,
            documents: [],
            childrenDocs: formData.get('childrenDocs'),
            createdAt: new Date().toISOString()
        };

        // Coleta documentos selecionados
        document.querySelectorAll('input[name="documents"]:checked').forEach(cb => {
            candidateData.documents.push(cb.value);
        });

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
        const childrenField = document.getElementById('children-docs-field');
        const hasChildren = document.getElementById('has-children').checked;
        
        if (hasChildren) {
            childrenField.style.display = 'block';
            // Não marca os documentos dos filhos automaticamente
            // O usuário deve marcar manualmente os documentos que possui
        } else {
            childrenField.style.display = 'none';
            // Desmarca os documentos dos filhos quando não tem filhos
            const cpfFilhosCheckbox = document.querySelector('input[name="documents"][value="CPF dos Filhos"]');
            const certidaoFilhosCheckbox = document.querySelector('input[name="documents"][value="Certidao de Nascimento dos Filhos"]');
            const vacinaFilhosCheckbox = document.querySelector('input[name="documents"][value="Cartao de Vacina dos Filhos"]');
            
            if (cpfFilhosCheckbox) cpfFilhosCheckbox.checked = false;
            if (certidaoFilhosCheckbox) certidaoFilhosCheckbox.checked = false;
            if (vacinaFilhosCheckbox) vacinaFilhosCheckbox.checked = false;
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
        const headers = ['Nome', 'Gênero', 'Tem Filhos', 'Documentos Entregues', 'Documentos Exigidos', 'Status'];
        
        const csvData = this.candidates.map(candidate => {
            const status = this.calculateStatus(candidate);
            return [
                candidate.name,
                candidate.gender,
                candidate.hasChildren ? 'Sim' : 'Não',
                status.delivered,
                status.total,
                status.isComplete ? 'COMPLETO' : 'INCOMPLETO'
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
            this.candidates = this.generateSampleData();
            this.saveData();
            this.render();
            this.showToast('Todos os dados foram resetados!', 'info');
        }
    }

    // ==================== COMUNICAÇÃO ====================
    
    printPendingList() {
        window.print();
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

