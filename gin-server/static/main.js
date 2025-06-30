document.getElementById('list').addEventListener('click', async () => {
    const res = await fetch('/api/richmenus');
    const data = await res.json();
    document.getElementById('output').textContent = JSON.stringify(data, null, 2);
});
