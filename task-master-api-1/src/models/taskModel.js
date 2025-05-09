class Task {
    constructor(title, description, dueDate) {
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.status = 'pending'; // default status
        this.creationDate = new Date(); // sets the creation date to now
    }
}

module.exports = Task;